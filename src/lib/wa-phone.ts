/** Normalização e comparação de telefones BR para o CRM WhatsApp. */

const BR_MOBILE_E164 = /^55[1-9]\d9\d{8}$/;

export function digitsOnly(phone: string): string {
  return phone.replace(/@.+$/i, "").replace(/\D/g, "");
}

export function isWhatsAppLid(input: string): boolean {
  return /@lid/i.test(input);
}

/** Identificador interno do WhatsApp (não é telefone BR). */
export function isLikelyWaLidKey(input: string): boolean {
  if (isWhatsAppLid(input)) return true;
  const d = digitsOnly(input);
  if (!d || isBrazilMobileE164(d)) return false;
  return d.length >= 14;
}

/** Celular BR válido em E.164 (55 + DDD + 9 dígitos). */
export function isBrazilMobileE164(input: string): boolean {
  const d = digitsOnly(input);
  return BR_MOBILE_E164.test(d);
}

/** Extrai um celular BR embutido em strings longas (ex.: LID numérico da Z-API). */
export function extractBrazilMobileFromLong(digits: string): string | null {
  const matches = digits.match(/55[1-9]\d9\d{8}/g);
  if (!matches?.length) return null;
  return matches[matches.length - 1] ?? null;
}

/** Últimos 11 dígitos (DDD + número) — identifica o mesmo celular em formatos diferentes. */
export function phoneTail11(phone: string): string {
  const normalized = normalizeBrazilPhone(phone);
  if (normalized) return normalized.slice(-11);
  const d = digitsOnly(phone);
  if (isBrazilMobileE164(d)) return d.slice(-11);
  return d.slice(-11);
}

/**
 * E.164 Brasil: 55 + DDD + número.
 * Insere o 9º dígito em celulares antigos (8 dígitos locais).
 * Ignora @lid e números inválidos (comuns em webhooks Z-API).
 */
export function normalizeBrazilPhone(input: string): string {
  if (!input?.trim() || isWhatsAppLid(input)) return "";

  let d = digitsOnly(input);
  if (!d) return "";
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("55")) d = `55${d}`;

  if (d.length > 13) {
    const embedded = extractBrazilMobileFromLong(d);
    if (embedded) return embedded;
    return "";
  }

  if (d.length === 13 && isBrazilMobileE164(d)) return d;

  // 55 + DDD(2) + 8 dígitos locais (celular legado sem o 9º dígito)
  if (d.length === 12) {
    const ddd = d.slice(2, 4);
    const local = d.slice(4);
    if (local.length === 8 && /^[6789]/.test(local)) {
      d = `55${ddd}9${local}`;
    }
  }

  return isBrazilMobileE164(d) ? d : "";
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizeBrazilPhone(a);
  const nb = normalizeBrazilPhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return phoneTail11(na) === phoneTail11(nb);
}

export type WaConversationPhoneRow = {
  id: string;
  contact_phone: string;
  contact_name?: string | null;
  patient_id?: string | null;
  unread_count?: number;
  status?: string;
  last_after_hours_reply_at?: string | null;
  last_message_at?: string | null;
  created_at?: string;
};

/** Encontra conversa existente mesmo com formatos diferentes de telefone (ex.: com/sem 55 ou 9º dígito). */
export function findConversationByPhone<T extends WaConversationPhoneRow>(
  rows: T[] | null | undefined,
  phone: string,
): T | null {
  if (!rows?.length) return null;
  const canonical = normalizeBrazilPhone(phone);
  const tail = phoneTail11(canonical);

  const matches = rows.filter((r) => phonesMatch(r.contact_phone, canonical));
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0]!;

  return [...matches].sort((a, b) => {
    const score = (r: WaConversationPhoneRow) =>
      (r.patient_id ? 4 : 0) +
      (r.contact_name && !/^\d+$/.test(r.contact_name.replace(/\D/g, "")) ? 2 : 0) +
      (r.last_message_at ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  })[0]!;
}

/** Chave de agrupamento para deduplicar conversas na lista. */
export function conversationGroupKey(row: WaConversationPhoneRow & { channel?: string | null }): string {
  const tail = phoneTail11(normalizeBrazilPhone(row.contact_phone));
  if (tail) return tail;
  const name = (row.contact_name ?? "sem-nome").trim().toLowerCase();
  const channel = row.channel ?? "whatsapp";
  return `no-phone:${channel}:${name}`;
}

function pickBestConversation<T extends WaConversationPhoneRow>(rows: T[]): T {
  return [...rows].sort((a, b) => {
    const score = (r: WaConversationPhoneRow) =>
      (r.patient_id ? 4 : 0) +
      (r.contact_name && !/^\d+$/.test(r.contact_name.replace(/\D/g, "")) ? 2 : 0) +
      (r.last_message_at ? 1 : 0) +
      (r.unread_count ?? 0) * 0.01;
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  })[0]!;
}

/** Lista única por celular — evita “Amor” + paciente com o mesmo número. */
export function dedupeConversationsByPhone<T extends WaConversationPhoneRow>(rows: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = conversationGroupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const deduped: T[] = [];
  for (const group of groups.values()) {
    const tail = phoneTail11(normalizeBrazilPhone(group[0]!.contact_phone));
    const keeper = tail
      ? findConversationByPhone(group, group[0]!.contact_phone) ?? pickBestConversation(group)
      : pickBestConversation(group);

    const totalUnread = group.reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
    deduped.push({ ...keeper, unread_count: totalUnread });
  }

  return deduped.sort(
    (a, b) =>
      new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime(),
  );
}
