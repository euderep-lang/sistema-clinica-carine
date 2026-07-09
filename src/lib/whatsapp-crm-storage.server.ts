import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  digitsOnly,
  findConversationByPhone,
  isBrazilMobileE164,
  isLikelyWaLidKey,
  normalizeBrazilPhone,
  phoneTail11,
  phonesMatch,
} from "@/lib/wa-phone";
import {
  DEFAULT_AFTER_HOURS_MESSAGE,
  isWithinBusinessHours,
  shouldSendAfterHoursReply,
} from "@/lib/wa-business-hours";
import { logWaAudit } from "@/lib/wa-audit.server";
import {
  assignOpenConversationsToReception,
  ensureConversationAssignedToReception,
  getDefaultReceptionAssignee,
} from "@/lib/wa-crm-assign.server";
import { getAfterHoursMessageServer, getBusinessHoursServer } from "@/lib/wa-tenant-settings.server";
import { applyWaTagRules, isFirstInboundMessage } from "@/lib/wa-tag-automation.server";
import { handleAppointmentConfirmationReply } from "@/lib/wa-appointment-confirmation.server";
import { isValidContactPhotoUrl } from "@/lib/wa-contact-photo";
import { providerSendText, isWhatsAppConfigured } from "@/lib/whatsapp-provider.server";
import { humanizeForConversation } from "@/lib/wa-quick-reply-ai.server";

export async function resolveTenantId(): Promise<string | null> {
  const { data } = await supabaseAdmin.from("tenants").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function findPatientByPhone(tenantId: string, phoneDigits: string) {
  const matches = await findPatientsByPhone(tenantId, phoneDigits);
  return matches.length === 1 ? matches[0]! : null;
}

/** Retorna todos os pacientes com o mesmo celular (pode haver duplicata no cadastro). */
export async function findPatientsByPhone(tenantId: string, phoneDigits: string) {
  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, phone")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  if (!patients?.length) return [];
  const normalized = normalizeBrazilPhone(phoneDigits);
  return patients.filter((p) => phonesMatch(p.phone ?? "", normalized));
}

type ConversationRow = {
  id: string;
  contact_phone: string;
  unread_count: number;
  contact_name: string | null;
  status: string;
  last_after_hours_reply_at: string | null;
  patient_id: string | null;
  last_message_at: string | null;
  created_at: string;
};

async function findConversationByPhoneTail(tenantId: string, phone: string) {
  const tail = phoneTail11(phone);
  if (!tail) return null;

  const { data: byTail } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select(
      "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .eq("phone_tail", tail)
    .maybeSingle();

  if (byTail) return byTail as ConversationRow;

  const { data: allConvs } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select(
      "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp");

  return findConversationByPhone((allConvs ?? []) as ConversationRow[], phone);
}

function waIdLookupVariants(waId: string): string[] {
  const raw = waId.trim();
  if (!raw) return [];
  const variants = new Set<string>([raw]);
  const digits = digitsOnly(raw);
  if (digits) {
    variants.add(digits);
    variants.add(`${digits}@lid`);
  }
  if (/@lid/i.test(raw)) variants.add(digits);
  return [...variants];
}

async function findConversationByWaId(tenantId: string, waId: string): Promise<ConversationRow | null> {
  for (const key of waIdLookupVariants(waId)) {
    const { data } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select(
        "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
      )
      .eq("tenant_id", tenantId)
      .eq("channel", "whatsapp")
      .eq("contact_wa_id", key)
      .maybeSingle();
    if (data) return data as ConversationRow;
  }
  return null;
}

function pickBestConversationRow(rows: ConversationRow[]): ConversationRow | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const score = (r: ConversationRow) =>
      (r.patient_id ? 4 : 0) +
      (r.contact_name && !/^\d+$/.test(r.contact_name.replace(/\D/g, "")) ? 2 : 0) +
      (r.last_message_at ? 1 : 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  })[0]!;
}

/** Encontra conversa que já trocou mensagens com o mesmo chatLid/phone do webhook. */
async function findConversationByChatLidHistory(
  tenantId: string,
  lid: string,
): Promise<ConversationRow | null> {
  const keys = waIdLookupVariants(lid);
  if (!keys.length) return null;

  const filters = new Set<string>();
  for (const key of keys) {
    filters.add(`raw_payload->>chatLid.eq.${key}`);
    filters.add(`raw_payload->>phone.eq.${key}`);
    const digits = digitsOnly(key);
    if (digits) {
      filters.add(`raw_payload->>chatLid.eq.${digits}@lid`);
      filters.add(`raw_payload->>phone.eq.${digits}@lid`);
    }
  }

  const { data: msgs } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("conversation_id")
    .eq("tenant_id", tenantId)
    .or([...filters].join(","))
    .order("created_at", { ascending: false })
    .limit(30);

  const convIds = [...new Set(((msgs ?? []) as { conversation_id: string }[]).map((m) => m.conversation_id))];
  if (!convIds.length) return null;

  const { data: convs } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select(
      "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .in("id", convIds);

  return pickBestConversationRow((convs ?? []) as ConversationRow[]);
}

async function mergeConversationsByChatLid(tenantId: string, keeperId: string, lid: string) {
  const keys = waIdLookupVariants(lid);
  if (!keys.length) return;

  const filters = new Set<string>();
  for (const key of keys) {
    filters.add(`raw_payload->>chatLid.eq.${key}`);
    filters.add(`raw_payload->>phone.eq.${key}`);
    const digits = digitsOnly(key);
    if (digits) {
      filters.add(`raw_payload->>chatLid.eq.${digits}@lid`);
      filters.add(`raw_payload->>phone.eq.${digits}@lid`);
    }
  }

  const { data: msgs } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("conversation_id")
    .eq("tenant_id", tenantId)
    .or([...filters].join(","))
    .limit(100);

  const dupeIds = [
    ...new Set(
      ((msgs ?? []) as { conversation_id: string }[])
        .map((m) => m.conversation_id)
        .filter((id) => id !== keeperId),
    ),
  ];

  for (const dupeId of dupeIds) {
    await mergeConversationIntoKeeper(tenantId, keeperId, dupeId);
  }
}

async function mergeConversationIntoKeeper(tenantId: string, keeperId: string, dupeId: string) {
  const { data: dupe } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("unread_count, last_message_at, last_message_preview")
    .eq("id", dupeId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!dupe) return;

  await supabaseAdmin.from("wa_messages" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupeId);
  await supabaseAdmin.from("wa_notes" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupeId);
  await supabaseAdmin.from("wa_reminders" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupeId);
  await supabaseAdmin.from("wa_transfers" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupeId);

  const { data: tagRows } = await supabaseAdmin
    .from("wa_conversation_tags" as never)
    .select("tag_id")
    .eq("conversation_id", dupeId);
  for (const row of (tagRows ?? []) as { tag_id: string }[]) {
    await supabaseAdmin
      .from("wa_conversation_tags" as never)
      .upsert({ conversation_id: keeperId, tag_id: row.tag_id } as never, {
        onConflict: "conversation_id,tag_id",
        ignoreDuplicates: true,
      });
  }
  await supabaseAdmin.from("wa_conversation_tags" as never).delete().eq("conversation_id", dupeId);

  const d = dupe as { unread_count: number; last_message_at: string | null; last_message_preview: string | null };
  const { data: keeper } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("unread_count, last_message_at, last_message_preview")
    .eq("id", keeperId)
    .maybeSingle();
  const k = keeper as { unread_count: number; last_message_at: string | null; last_message_preview: string | null } | null;
  const mergedLastAt = [k?.last_message_at, d.last_message_at].filter(Boolean).sort().reverse()[0] ?? null;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({
      unread_count: (k?.unread_count ?? 0) + (d.unread_count ?? 0),
      last_message_at: mergedLastAt,
      last_message_preview:
        mergedLastAt === d.last_message_at ? d.last_message_preview ?? k?.last_message_preview : k?.last_message_preview,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", keeperId);

  await supabaseAdmin.from("wa_conversations" as never).delete().eq("id", dupeId);
}

async function findConversationByContactName(
  tenantId: string,
  name: string,
): Promise<ConversationRow | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits === trimmed.replace(/\s/g, "") || digits.length >= 10) return null;

  const { data: byName } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select(
      "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .ilike("contact_name", trimmed)
    .order("patient_id", { ascending: false, nullsFirst: false })
    .order("last_message_at", { ascending: false, nullsFirst: true })
    .limit(1);

  if (byName?.[0]) return byName[0] as ConversationRow;

  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, phone")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .ilike("full_name", trimmed)
    .limit(2);

  if (patients?.length === 1 && patients[0]?.phone) {
    return findConversationByPhoneTail(tenantId, patients[0].phone);
  }

  return null;
}

/** Move mensagens/notas de conversas duplicadas para a conversa principal. */
export async function mergeDuplicateConversations(tenantId: string, keeperId: string, phone: string) {
  const tail = phoneTail11(phone);
  const { data: dupes } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, unread_count, last_message_at, last_message_preview")
    .eq("tenant_id", tenantId)
    .neq("id", keeperId);

  const toMerge = ((dupes ?? []) as {
    id: string;
    contact_phone: string;
    unread_count: number;
    last_message_at: string | null;
    last_message_preview: string | null;
  }[]).filter((d) => phonesMatch(d.contact_phone, phone) || (tail && phoneTail11(d.contact_phone) === tail));

  if (!toMerge.length) return keeperId;

  let extraUnread = 0;
  let bestLastAt: string | null = null;
  let bestPreview: string | null = null;

  for (const dupe of toMerge) {
    extraUnread += dupe.unread_count ?? 0;
    if (dupe.last_message_at && (!bestLastAt || dupe.last_message_at > bestLastAt)) {
      bestLastAt = dupe.last_message_at;
      bestPreview = dupe.last_message_preview;
    }

    await supabaseAdmin.from("wa_messages" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_notes" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_reminders" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_transfers" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);

    const { data: tagRows } = await supabaseAdmin
      .from("wa_conversation_tags" as never)
      .select("tag_id")
      .eq("conversation_id", dupe.id);
    for (const row of (tagRows ?? []) as { tag_id: string }[]) {
      await supabaseAdmin
        .from("wa_conversation_tags" as never)
        .upsert({ conversation_id: keeperId, tag_id: row.tag_id } as never, { onConflict: "conversation_id,tag_id", ignoreDuplicates: true });
    }
    await supabaseAdmin.from("wa_conversation_tags" as never).delete().eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_conversations" as never).delete().eq("id", dupe.id);
  }

  const { data: keeper } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("unread_count, last_message_at, last_message_preview")
    .eq("id", keeperId)
    .maybeSingle();

  const k = keeper as { unread_count: number; last_message_at: string | null; last_message_preview: string | null } | null;
  const mergedLastAt =
    [k?.last_message_at, bestLastAt].filter(Boolean).sort().reverse()[0] ?? null;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({
      contact_phone: phone,
      unread_count: (k?.unread_count ?? 0) + extraUnread,
      last_message_at: mergedLastAt,
      last_message_preview:
        mergedLastAt === bestLastAt ? bestPreview ?? k?.last_message_preview : k?.last_message_preview,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", keeperId);

  return keeperId;
}

export async function upsertConversation(
  tenantId: string,
  fromPhone: string,
  contactName: string | null,
  preview: string,
  timestamp: Date,
  options?: { incrementUnread?: boolean; waId?: string | null; rawPhone?: string | null; photoUrl?: string | null },
) {
  const rawWaId = options?.waId ?? options?.rawPhone ?? fromPhone;
  const photoPatch = isValidContactPhotoUrl(options?.photoUrl)
    ? {
        contact_photo_url: options!.photoUrl!.trim(),
        contact_photo_fetched_at: timestamp.toISOString(),
      }
    : {};
  let phone = normalizeBrazilPhone(fromPhone);

  let existing = phone ? await findConversationByPhoneTail(tenantId, phone) : null;

  if (!existing && rawWaId) {
    existing = await findConversationByWaId(tenantId, rawWaId);
    if (!existing) existing = await findConversationByChatLidHistory(tenantId, rawWaId);
  }

  if (!existing && options?.rawPhone && options.rawPhone !== rawWaId) {
    existing = await findConversationByChatLidHistory(tenantId, options.rawPhone);
  }

  if (!existing && contactName) {
    existing = await findConversationByContactName(tenantId, contactName);
  }

  if (existing && !phone) {
    phone = normalizeBrazilPhone(existing.contact_phone) || existing.contact_phone;
  }

  if (!phone && isLikelyWaLidKey(fromPhone) && existing) {
    phone = normalizeBrazilPhone(existing.contact_phone) || existing.contact_phone;
  }

  if (!phone || !isBrazilMobileE164(phone)) {
    throw new Error(`Telefone inválido para conversa WhatsApp: ${fromPhone || "(vazio)"}`);
  }

  const contactWaId = rawWaId?.trim() || fromPhone;
  const autoPatient = await findPatientByPhone(tenantId, phone);
  if (!existing) {
    existing = await findConversationByPhoneTail(tenantId, phone);
  }
  const receptionistId = await getDefaultReceptionAssignee(tenantId);

  if (existing) {
    const row = existing;
    const incrementUnread = options?.incrementUnread ?? true;
    const wasClosed = row.status === "closed";
    const resolvedPatientId = row.patient_id ?? autoPatient?.id ?? null;

    let displayName = row.contact_name ?? contactName ?? phone;
    if (resolvedPatientId) {
      const { data: linked } = await supabaseAdmin
        .from("patients")
        .select("full_name")
        .eq("id", resolvedPatientId)
        .maybeSingle();
      displayName = linked?.full_name ?? displayName;
    } else if (autoPatient) {
      displayName = autoPatient.full_name;
    }

    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        patient_id: resolvedPatientId,
        contact_name: displayName,
        contact_phone: phone,
        contact_wa_id: contactWaId,
        last_message_at: timestamp.toISOString(),
        last_message_preview: preview,
        unread_count: incrementUnread ? row.unread_count + 1 : row.unread_count,
        updated_at: new Date().toISOString(),
        status: "open",
        ...(row.assigned_to ? {} : receptionistId ? { assigned_to: receptionistId } : {}),
        ...(wasClosed
          ? { close_reason: null, closed_at: null, closed_by: null }
          : {}),
        ...photoPatch,
      } as never)
      .eq("id", row.id);

    await mergeDuplicateConversations(tenantId, row.id, phone);
    if (rawWaId) await mergeConversationsByChatLid(tenantId, row.id, rawWaId);
    if (!row.assigned_to) await ensureConversationAssignedToReception(tenantId, row.id);
    return { id: row.id, lastAfterHoursReplyAt: row.last_after_hours_reply_at };
  }

  const { data: created, error } = await supabaseAdmin
    .from("wa_conversations" as never)
    .insert({
      tenant_id: tenantId,
      patient_id: autoPatient?.id ?? null,
      contact_phone: phone,
      contact_name: autoPatient?.full_name ?? contactName ?? phone,
      contact_wa_id: contactWaId,
      assigned_to: receptionistId,
      last_message_at: timestamp.toISOString(),
      last_message_preview: preview,
      unread_count: options?.incrementUnread === false ? 0 : 1,
      status: "open",
      ...photoPatch,
    } as never)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const retry = await findConversationByPhoneTail(tenantId, phone);
      if (retry) {
        await supabaseAdmin
          .from("wa_conversations" as never)
          .update({
            patient_id: retry.patient_id ?? autoPatient?.id ?? null,
            contact_name: retry.contact_name ?? autoPatient?.full_name ?? contactName ?? phone,
            contact_phone: phone,
            contact_wa_id: contactWaId,
            last_message_at: timestamp.toISOString(),
            last_message_preview: preview,
            unread_count: (options?.incrementUnread ?? true) ? retry.unread_count + 1 : retry.unread_count,
            updated_at: new Date().toISOString(),
            status: "open",
            ...photoPatch,
          } as never)
          .eq("id", retry.id);
        await mergeDuplicateConversations(tenantId, retry.id, phone);
        if (rawWaId) await mergeConversationsByChatLid(tenantId, retry.id, rawWaId);
        return { id: retry.id, lastAfterHoursReplyAt: retry.last_after_hours_reply_at };
      }
    }
    throw new Error(error.message);
  }

  const id = (created as { id: string }).id;
  await mergeDuplicateConversations(tenantId, id, phone);
  if (rawWaId) await mergeConversationsByChatLid(tenantId, id, rawWaId);
  return { id, lastAfterHoursReplyAt: null as string | null };
}

export async function maybeSendAfterHoursAutoReply(
  tenantId: string,
  conversationId: string,
  phone: string,
  lastAfterHoursReplyAt: string | null,
) {
  if (!isWhatsAppConfigured()) return;

  const [hours, customMessage] = await Promise.all([
    getBusinessHoursServer(tenantId),
    getAfterHoursMessageServer(tenantId),
  ]);

  const now = new Date();
  if (isWithinBusinessHours(hours, now)) return;
  if (!shouldSendAfterHoursReply(lastAfterHoursReplyAt, now)) return;

  const message = customMessage?.trim() || DEFAULT_AFTER_HOURS_MESSAGE;
  try {
    const humanized = await humanizeForConversation(tenantId, message, { conversationId });
    const normalized = normalizeBrazilPhone(phone);
    const { messageId } = await providerSendText(normalized, humanized);
    const ts = now.toISOString();

    await supabaseAdmin.from("wa_messages" as never).insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "text",
      body: humanized,
      status: "sent",
      sent_by: null,
      created_at: ts,
    } as never);

    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        last_after_hours_reply_at: ts,
        last_message_at: ts,
        last_message_preview: humanized.slice(0, 120),
        updated_at: ts,
      } as never)
      .eq("id", conversationId);

    await logWaAudit({
      tenantId,
      conversationId,
      action: "after_hours_auto_reply",
      details: { preview: humanized.slice(0, 80) },
      source: "automation",
    });
  } catch (e) {
    console.error("[CRM] after-hours auto-reply failed:", e);
  }
}

export async function trackStaffFirstResponse(conversationId: string) {
  const { data } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("first_response_at")
    .eq("id", conversationId)
    .maybeSingle();
  if ((data as { first_response_at?: string | null } | null)?.first_response_at) return;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ first_response_at: new Date().toISOString() } as never)
    .eq("id", conversationId);
}

export async function messageExists(waMessageId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id")
    .eq("wa_message_id", waMessageId)
    .maybeSingle();
  return !!data;
}

export async function insertWaMessage(input: {
  tenantId: string;
  conversationId: string;
  waMessageId: string;
  direction: "inbound" | "outbound";
  messageType: string;
  body: string;
  mediaId?: string | null;
  mediaMime?: string | null;
  mediaFilename?: string | null;
  status?: string;
  sentBy?: string | null;
  sentAt?: Date;
  rawPayload?: unknown;
}) {
  if (await messageExists(input.waMessageId)) return false;

  const sentAt = (input.sentAt ?? new Date()).toISOString();

  const { error } = await supabaseAdmin.from("wa_messages" as never).insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    wa_message_id: input.waMessageId,
    direction: input.direction,
    message_type: input.messageType,
    body: input.body,
    media_id: input.mediaId ?? null,
    media_mime: input.mediaMime ?? null,
    media_filename: input.mediaFilename ?? null,
    status: input.status ?? (input.direction === "inbound" ? "delivered" : "sent"),
    sent_by: input.sentBy ?? null,
    created_at: sentAt,
    raw_payload: input.rawPayload as never,
  } as never);

  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);

  if (input.direction === "inbound") {
    const { data: conv } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("channel, pipeline_stage_id")
      .eq("id", input.conversationId)
      .maybeSingle();
    const convRow = conv as { channel?: string; pipeline_stage_id?: string | null } | null;
    const firstInbound = await isFirstInboundMessage(input.conversationId);
    void applyWaTagRules({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      channel: convRow?.channel ?? "whatsapp",
      messageBody: input.body,
      isFirstInbound: firstInbound,
      pipelineStageId: convRow?.pipeline_stage_id,
    }).catch((e) => console.error("[CRM] tag rules error:", e));

    const { data: convMeta } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("contact_name")
      .eq("id", input.conversationId)
      .maybeSingle();

    void handleAppointmentConfirmationReply({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      patientId: undefined,
      messageBody: input.body,
    }).catch((e) => console.error("[CRM] appointment confirmation error:", e));

    void onInboundMessageForFollowUp({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      patientName: (convMeta as { contact_name?: string | null } | null)?.contact_name,
      isFirstInbound: firstInbound,
    }).catch((e) => console.error("[CRM] follow-up inbound error:", e));
  }

  return true;
}

/** Preenche media_id em mensagens já gravadas sem mídia (ex.: áudio enviado pelo CRM antes do webhook). */
export async function patchWaMessageMediaIfMissing(
  waMessageId: string,
  mediaId: string | null | undefined,
  mediaMime?: string | null,
  mediaFilename?: string | null,
): Promise<void> {
  if (!mediaId) return;
  const { data } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id, media_id")
    .eq("wa_message_id", waMessageId)
    .maybeSingle();
  const row = data as { id: string; media_id: string | null } | null;
  if (!row?.id || row.media_id) return;

  await supabaseAdmin
    .from("wa_messages" as never)
    .update({
      media_id: mediaId,
      ...(mediaMime ? { media_mime: mediaMime } : {}),
      ...(mediaFilename ? { media_filename: mediaFilename } : {}),
    } as never)
    .eq("id", row.id);
}

export async function updateMessageStatus(waMessageId: string, status: string, errorMessage?: string) {
  const mapped =
    status === "sent" || status === "SENT"
      ? "sent"
      : status === "delivered" || status === "RECEIVED"
        ? "delivered"
        : status === "read" || status === "READ" || status === "PLAYED"
          ? "read"
          : status === "failed" || status === "FAILED"
            ? "failed"
            : null;
  if (!mapped) return;

  await supabaseAdmin
    .from("wa_messages" as never)
    .update({
      status: mapped,
      error_message: errorMessage ?? null,
    } as never)
    .eq("wa_message_id", waMessageId);
}

/** Reflete no CRM uma mensagem apagada no WhatsApp (revoke feito pelo contato ou no celular). */
export async function markWaMessageDeletedByWaId(waMessageId: string) {
  const { data: existing } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id, deleted_at")
    .eq("wa_message_id", waMessageId)
    .maybeSingle();
  const row = existing as { id: string; deleted_at: string | null } | null;
  if (!row || row.deleted_at) return;

  await supabaseAdmin
    .from("wa_messages" as never)
    .update({ deleted_at: new Date().toISOString(), deleted_scope: "everyone" } as never)
    .eq("id", row.id);
}

/** Garante que todos os chats ativos da Z-API existam no CRM (última mensagem conhecida). */
function zapiChatPreview(chat: {
  lastMessageText?: string;
  lastMessage?: string;
  message?: string;
}): string {
  const text = chat.lastMessageText ?? chat.lastMessage ?? chat.message;
  if (typeof text === "string" && text.trim()) return text.trim().slice(0, 120);
  return "Aguardando mensagens (webhook)";
}

export async function syncZApiChatsToCrm(tenantId: string, chats: {
  phone: string;
  name?: string;
  lastMessageTime?: string | number;
  lastMessageText?: string;
  lastMessage?: string;
  message?: string;
  messagesUnread?: number | string;
  isGroup?: boolean;
}[]) {
  let synced = 0;
  for (const chat of chats) {
    if (chat.isGroup) continue;
    if (!chat.phone?.trim()) continue;

    const phone = normalizeBrazilPhone(chat.phone);
    if (!phone) continue;

    const tsRaw = chat.lastMessageTime;
    const ts = tsRaw
      ? new Date(typeof tsRaw === "string" ? Number(tsRaw) * (tsRaw.length <= 10 ? 1000 : 1) : tsRaw)
      : new Date();
    const preview = zapiChatPreview(chat);
    const unread = Number(chat.messagesUnread ?? 0);

    const conv = await upsertConversation(tenantId, phone, chat.name ?? null, preview, ts, {
      incrementUnread: false,
    });

    const updates: Record<string, unknown> = {};
    if (unread > 0) updates.unread_count = unread;
    updates.channel = "whatsapp";

    if (Object.keys(updates).length) {
      await supabaseAdmin
        .from("wa_conversations" as never)
        .update(updates as never)
        .eq("id", conv.id);
    }
    synced++;
  }

  await assignOpenConversationsToReception(tenantId, { onlyUnassigned: true });
  return synced;
}

export type SocialChannel = "instagram" | "messenger";

export async function upsertSocialConversation(
  tenantId: string,
  channel: SocialChannel,
  externalUserId: string,
  contactName: string | null,
  preview: string,
  timestamp: Date,
) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  const { data: existing } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, unread_count, status, contact_name")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("external_user_id", externalUserId)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; unread_count: number; status: string; contact_name: string | null };
    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        contact_name: contactName ?? row.contact_name,
        contact_phone: externalUserId,
        last_message_at: timestamp.toISOString(),
        last_message_preview: preview,
        unread_count: row.unread_count + 1,
        updated_at: new Date().toISOString(),
        status: "open",
        ...(row.assigned_to || !receptionistId ? {} : { assigned_to: receptionistId }),
      } as never)
      .eq("id", row.id);
    return { id: row.id };
  }

  const { data: created, error } = await supabaseAdmin
    .from("wa_conversations" as never)
    .insert({
      tenant_id: tenantId,
      channel,
      external_user_id: externalUserId,
      contact_phone: externalUserId,
      contact_name: contactName ?? externalUserId,
      assigned_to: receptionistId,
      last_message_at: timestamp.toISOString(),
      last_message_preview: preview,
      unread_count: 1,
      status: "open",
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: (created as { id: string }).id };
}
