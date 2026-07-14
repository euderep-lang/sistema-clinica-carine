/** Parâmetros de busca do inbox CRM (`/crm/inbox`). */
import { normalizeWaPhone } from "@/lib/wa-phone";

export interface CrmInboxSearch {
  conversation?: string;
  patient?: string;
  phone?: string;
  draft?: string;
}

export function normalizeCrmPhone(phone: string | null | undefined, phoneDdi?: string | null): string | null {
  if (!phone) return null;
  const d = normalizeWaPhone(phone, phoneDdi);
  return d.length >= 10 ? d : null;
}

export function buildCrmInboxSearch(options: {
  patientId?: string | null;
  phone?: string | null;
  phoneDdi?: string | null;
  conversationId?: string | null;
  draft?: string | null;
}): CrmInboxSearch {
  const search: CrmInboxSearch = {};

  if (options.conversationId) {
    search.conversation = options.conversationId;
  } else if (options.patientId) {
    search.patient = options.patientId;
  } else {
    const phone = normalizeCrmPhone(options.phone, options.phoneDdi);
    if (phone) search.phone = phone;
  }

  const draft = options.draft?.trim();
  if (draft) search.draft = draft;

  return search;
}

type CrmNavigate = (opts: { to: "/crm/inbox"; search: CrmInboxSearch }) => void;

/** Abre o inbox CRM com paciente/telefone e rascunho opcional. */
export function openCrmInbox(
  navigate: CrmNavigate,
  options: Parameters<typeof buildCrmInboxSearch>[0],
): boolean {
  const search = buildCrmInboxSearch(options);
  if (!search.conversation && !search.patient && !search.phone) return false;
  navigate({ to: "/crm/inbox", search });
  return true;
}
