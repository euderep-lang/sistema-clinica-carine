import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fmtDateFromDate, fmtTimeFromDate, todayISO, zonedDateFromWallClock } from "@/lib/locale";
import { renderTemplate } from "@/lib/settings-helpers";
import { normalizeWaPhone, phonesMatch, resolvePatientPhoneE164 } from "@/lib/wa-phone";
import { getDefaultReceptionAssignee } from "@/lib/wa-crm-assign.server";
import { getFollowUpSequencesServer, getNpsSettingsServer } from "@/lib/wa-tenant-settings.server";
import {
  buildNpsTemplateVars,
  pickNpsMessageTemplate,
  renderNpsMessage,
} from "@/lib/wa-nps-settings";
import {
  FOLLOW_UP_SEQUENCE_DEFAULTS,
  primaryTemplate,
  type FollowUpMode,
  type FollowUpStepDef,
} from "@/lib/wa-follow-up-templates";
import { pickAndAdvanceMessageVariant } from "@/lib/wa-follow-up-variant.server";
import { insertWaMessage } from "@/lib/whatsapp-crm-storage.server";
import { logAuditSafe } from "@/lib/audit.server";
import { isWhatsAppConfigured, providerSendText } from "@/lib/whatsapp-provider.server";
import { buildGenderTemplateVars } from "@/lib/wa-template-gender";
import { normalizeOutboundMessageBody } from "@/lib/wa-automation-quick-replies.server";
import { normalizeManualOutboundMessage } from "@/lib/wa-quick-reply-ai.server";
import { getPublicAppUrl } from "@/lib/app-url";
import {
  ensureScheduledInMessagingWindow,
  isWithinMessagingWindow,
  nextMessagingWindowStart,
  resolveAppointmentRelativeSchedule,
} from "@/lib/wa-appointment-reminders";
import {
  appointmentOccursAfter,
  POST_CONSULTATION_ATTENDED_STATUSES,
  POST_CONSULTATION_BOOKED_STATUSES,
  POST_CONSULTATION_NO_INTERVENING_STEPS,
} from "@/lib/wa-follow-up-guards";
import { startOfWeekMonday, shiftDate } from "@/lib/agenda-utils";
import {
  evaluateLeadNoResponseConversation,
  heuristicLeadNoResponseGate,
} from "@/lib/wa-lead-conversation-gate.server";

export type { FollowUpMode, FollowUpStepDef };

export type FollowUpTrigger =
  | "lead_no_response"
  | "lead_price_sent"
  | "appointment_booked"
  | "post_consultation"
  | "no_show"
  | "reactivation"
  | "objection"
  | "professional_request"
  | "nps";

/** Aguarda este tempo após concluir a consulta antes de enviar o NPS por WhatsApp (padrão; sobrescrito em wa_nps_settings). */
export const NPS_SEND_DELAY_MINUTES = 5;
const NPS_STEP_KEY = "nps_post_consultation";

export const OBJECTION_TYPES = {
  vou_pensar: "Vou pensar",
  achei_caro: "Achei caro",
  preciso_agenda: "Preciso ver agenda",
  medo_hormonio: "Medo de hormônio/remédio",
} as const;

export type ObjectionType = keyof typeof OBJECTION_TYPES;

/** Padrões embutidos — use getFollowUpSequencesServer para versão com overrides do tenant. */
export const FOLLOW_UP_SEQUENCES = FOLLOW_UP_SEQUENCE_DEFAULTS;

export const FOLLOW_UP_TAG_POST_CONSULT = {
  name: "Follow-up Pós-Consulta",
  color: "#166534",
};

const PRICE_KEYWORDS = [
  "valor",
  "preço",
  "preco",
  "r$",
  "investimento",
  "custa",
  "quanto",
  "orçamento",
  "orcamento",
];

export function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return "";
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * Quando não há nome, remove buracos deixados por {{primeiro_nome}} vazio
 * ("Oi, , tudo bem?" → "Oi, tudo bem?" / ", passando" → "Passando").
 */
export function tidyMissingFirstName(text: string): string {
  let out = text;
  out = out.replace(/,\s*,+/g, ",");
  out = out.replace(/,\s*([!?.…])/g, "$1");
  out = out.replace(/^\s*,\s*/u, "");
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/^([a-záàâãéêíóôõúç])/iu, (ch) => ch.toLocaleUpperCase("pt-BR"));
  return out.trim();
}

export function detectPriceInMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return PRICE_KEYWORDS.some((k) => lower.includes(k)) || /\br\$\s*\d/.test(lower);
}

type TemplateContext = {
  patientName?: string | null;
  patientGender?: string | null;
  professionalName?: string | null;
  tenantName?: string | null;
  appointmentAt?: Date | null;
};

/** Nome para mensagens: usa o nome de exibição (como gostaria de ser chamado) e cai para o nome completo. */
function professionalDisplayName(
  professional?: { full_name?: string | null; display_name?: string | null } | null,
): string | null {
  return professional?.display_name?.trim() || professional?.full_name || null;
}

export function buildFollowUpVars(ctx: TemplateContext): Record<string, string> {
  const appt = ctx.appointmentAt ?? null;
  return {
    ...buildGenderTemplateVars(ctx.patientGender),
    primeiro_nome: firstName(ctx.patientName),
    nome_paciente: firstName(ctx.patientName),
    nome_profissional: ctx.professionalName?.trim() || "equipe médica",
    nome_clinica: ctx.tenantName?.trim() || "nossa clínica",
    data_consulta: appt ? fmtDateFromDate(appt) : "{{data_consulta}}",
    hora_consulta: appt ? fmtTimeFromDate(appt) : "{{hora_consulta}}",
  };
}

export function renderFollowUpMessage(template: string, ctx: TemplateContext): string {
  const rendered = renderTemplate(template, buildFollowUpVars(ctx));
  const cleaned = firstName(ctx.patientName) ? rendered : tidyMissingFirstName(rendered);
  return normalizeOutboundMessageBody(cleaned);
}

export async function logCrmEvent(input: {
  tenantId: string;
  eventType: string;
  conversationId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("wa_crm_events" as never).insert({
    tenant_id: input.tenantId,
    event_type: input.eventType,
    conversation_id: input.conversationId ?? null,
    patient_id: input.patientId ?? null,
    appointment_id: input.appointmentId ?? null,
    user_id: input.userId ?? null,
    metadata: input.metadata ?? {},
  } as never);
}

async function getTenantName(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  return data?.name ?? "Clínica";
}

export async function ensureFollowUpTag(tenantId: string, name: string, color: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("wa_tags" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabaseAdmin
    .from("wa_tags" as never)
    .insert({ tenant_id: tenantId, name, color } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (created as { id: string }).id;
}

async function applyTagToConversation(conversationId: string, tagId: string) {
  await supabaseAdmin.from("wa_conversation_tags" as never).upsert(
    { conversation_id: conversationId, tag_id: tagId } as never,
    { onConflict: "conversation_id,tag_id", ignoreDuplicates: true },
  );
}

export { resolvePatientPhoneE164 };

type OutboundConversation = {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  status?: string | null;
  channel?: string | null;
};

function isWhatsAppChannel(channel: string | null | undefined): boolean {
  return (channel ?? "whatsapp") === "whatsapp";
}

function pickPreferredConversation(rows: OutboundConversation[]): OutboundConversation | null {
  if (!rows.length) return null;
  const wa = rows.filter((c) => isWhatsAppChannel(c.channel));
  const pool = wa.length ? wa : rows;
  const open = pool.find((c) => c.status !== "closed");
  return open ?? pool[0] ?? null;
}

function conversationMatchesPhone(
  contactPhone: string,
  patientPhoneE164: string | null | undefined,
  rawPatientPhone?: string | null,
): boolean {
  if (!patientPhoneE164 && !rawPatientPhone) return false;
  if (patientPhoneE164 && phonesMatch(contactPhone, patientPhoneE164)) return true;
  if (rawPatientPhone && phonesMatch(contactPhone, rawPatientPhone)) return true;
  return false;
}

export async function findConversationForPatient(
  tenantId: string,
  patientId: string,
): Promise<OutboundConversation | null> {
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("phone, phone_ddi, full_name")
    .eq("id", patientId)
    .maybeSingle();
  const patientPhone = patient?.phone
    ? resolvePatientPhoneE164(patient.phone, patient.phone_ddi)
    : null;

  const { data: byLink } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, contact_name, status, channel")
    .eq("tenant_id", tenantId)
    .eq("patient_id", patientId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20);
  const linked = (byLink ?? []) as OutboundConversation[];

  // Prioriza conversa com o telefone ATUAL do paciente (evita enviar pro número antigo).
  if (patientPhone || patient?.phone) {
    const matching = linked.filter((c) =>
      conversationMatchesPhone(c.contact_phone, patientPhone, patient?.phone),
    );
    const preferred = pickPreferredConversation(matching);
    if (preferred) return preferred;
  }

  // Sem match pelo número atual: tenta achar conversa pelo telefone (ainda sem vínculo).
  if (patientPhone || patient?.phone) {
    const { data: convs } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("id, contact_phone, contact_name, status, channel")
      .eq("tenant_id", tenantId)
      .limit(500);
    const matches = ((convs ?? []) as OutboundConversation[]).filter((c) =>
      conversationMatchesPhone(c.contact_phone, patientPhone, patient?.phone),
    );
    const match = pickPreferredConversation(matches);
    if (match) {
      await supabaseAdmin
        .from("wa_conversations" as never)
        .update({ patient_id: patientId, contact_name: patient?.full_name ?? match.contact_name } as never)
        .eq("id", match.id);
      return match;
    }
  }

  // Sem telefone no cadastro: usa qualquer conversa vinculada (legado).
  if (!patientPhone && !patient?.phone) {
    return pickPreferredConversation(linked);
  }

  // Tem telefone novo e nenhuma conversa nesse número — não reutiliza o número antigo.
  return null;
}

/**
 * Após trocar o telefone no cadastro: migra automações pendentes para a conversa do número novo
 * e encerra conversas abertas no número antigo (sem apagar histórico).
 */
export async function syncPatientWhatsAppPhone(
  tenantId: string,
  patientId: string,
): Promise<{ conversationId: string | null; migratedSchedules: number }> {
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("phone, phone_ddi, full_name")
    .eq("id", patientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!patient?.phone?.trim()) {
    return { conversationId: null, migratedSchedules: 0 };
  }

  const newPhone = resolvePatientPhoneE164(patient.phone, patient.phone_ddi);
  if (!newPhone) return { conversationId: null, migratedSchedules: 0 };

  const target = await ensureOutboundConversationForPatient(tenantId, patientId);
  if (!target) return { conversationId: null, migratedSchedules: 0 };

  const { data: linked } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, status")
    .eq("tenant_id", tenantId)
    .eq("patient_id", patientId);

  const now = new Date().toISOString();
  const staleIds: string[] = [];
  for (const row of (linked ?? []) as { id: string; contact_phone: string; status: string | null }[]) {
    if (row.id === target.id) continue;
    if (conversationMatchesPhone(row.contact_phone, newPhone, patient.phone)) continue;
    staleIds.push(row.id);
    if (row.status !== "closed") {
      await supabaseAdmin
        .from("wa_conversations" as never)
        .update({
          status: "closed",
          close_reason: "phone_changed",
          closed_at: now,
          updated_at: now,
        } as never)
        .eq("id", row.id);
    }
  }

  let migratedSchedules = 0;
  if (staleIds.length) {
    const { data: pending } = await supabaseAdmin
      .from("wa_follow_up_schedules" as never)
      .select("id")
      .eq("patient_id", patientId)
      .eq("status", "pending")
      .in("conversation_id", staleIds);
    const ids = ((pending ?? []) as { id: string }[]).map((p) => p.id);
    if (ids.length) {
      const { error } = await supabaseAdmin
        .from("wa_follow_up_schedules" as never)
        .update({ conversation_id: target.id } as never)
        .in("id", ids);
      if (!error) migratedSchedules = ids.length;
    }

    await supabaseAdmin
      .from("wa_follow_up_runs" as never)
      .update({ conversation_id: target.id } as never)
      .eq("patient_id", patientId)
      .eq("status", "active")
      .in("conversation_id", staleIds);
  }

  return { conversationId: target.id, migratedSchedules };
}

async function reopenConversationForOutbound(conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({
      status: "open",
      close_reason: null,
      closed_at: null,
      closed_by: null,
      updated_at: now,
    } as never)
    .eq("id", conversationId);
}

/** Garante conversa WA para envio outbound (cria pelo telefone do paciente se necessário). */
export async function ensureOutboundConversationForPatient(
  tenantId: string,
  patientId: string,
): Promise<OutboundConversation | null> {
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("full_name, phone, phone_ddi")
    .eq("id", patientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!patient?.phone?.trim()) return null;

  const phone = resolvePatientPhoneE164(patient.phone, patient.phone_ddi);
  if (!phone) return null;

  const existing = await findConversationForPatient(tenantId, patientId);
  if (
    existing &&
    isWhatsAppChannel(existing.channel) &&
    conversationMatchesPhone(existing.contact_phone, phone, patient.phone)
  ) {
    if (existing.status === "closed") {
      await reopenConversationForOutbound(existing.id);
      return { ...existing, status: "open" };
    }
    return existing;
  }

  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  const now = new Date().toISOString();

  const { data: created, error } = await supabaseAdmin
    .from("wa_conversations" as never)
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      contact_phone: phone,
      contact_name: patient.full_name?.trim() || phone,
      contact_wa_id: phone,
      channel: "whatsapp",
      assigned_to: receptionistId,
      status: "open",
      unread_count: 0,
      last_message_at: now,
      updated_at: now,
    } as never)
    .select("id, contact_phone, contact_name, status, channel")
    .single();

  if (error) {
    const fallback = await findConversationForPatient(tenantId, patientId);
    if (fallback?.status === "closed" && isWhatsAppChannel(fallback.channel)) {
      await reopenConversationForOutbound(fallback.id);
      return { ...fallback, status: "open" };
    }
    return fallback;
  }

  return created as OutboundConversation;
}

type WaMessageRow = {
  direction: "inbound" | "outbound";
  created_at: string;
  sent_by: string | null;
  body: string | null;
};

export type ConversationAnalysis = {
  conversationId: string;
  status: string;
  closedAt: string | null;
  firstResponseAt: string | null;
  lastPatientReplyAt: string | null;
  priceSentAt: string | null;
  inboundCount: number;
  outboundStaffCount: number;
  lastInboundAt: string | null;
  lastOutboundStaffAt: string | null;
  /** Primeira mensagem humana da equipe. */
  firstOutboundStaffAt: string | null;
  /** Paciente escreveu de novo depois que a equipe começou a atender. */
  inboundAfterStaffCount: number;
  lastMessage: WaMessageRow | null;
  recentMessages: WaMessageRow[];
};

type FollowUpDecision = { ok: true } | { ok: false; reason: string; cancelRun?: boolean };

export async function analyzeConversation(conversationId: string): Promise<ConversationAnalysis | null> {
  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, status, closed_at, first_response_at, last_patient_reply_at, price_sent_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const convRow = conv as {
    id: string;
    status: string;
    closed_at: string | null;
    first_response_at: string | null;
    last_patient_reply_at: string | null;
    price_sent_at: string | null;
  };

  const { data: messages } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("direction, created_at, sent_by, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const rows = (messages ?? []) as WaMessageRow[];
  let inboundCount = 0;
  let outboundStaffCount = 0;
  let lastInboundAt: string | null = null;
  let lastOutboundStaffAt: string | null = null;
  let firstOutboundStaffAt: string | null = null;
  let inboundAfterStaffCount = 0;

  for (const m of rows) {
    if (m.direction === "inbound") {
      inboundCount++;
      lastInboundAt = m.created_at;
      if (firstOutboundStaffAt && m.created_at > firstOutboundStaffAt) {
        inboundAfterStaffCount++;
      }
    } else if (m.sent_by) {
      if (!firstOutboundStaffAt) firstOutboundStaffAt = m.created_at;
      outboundStaffCount++;
      lastOutboundStaffAt = m.created_at;
    }
  }

  return {
    conversationId,
    status: convRow.status,
    closedAt: convRow.closed_at,
    firstResponseAt: convRow.first_response_at,
    lastPatientReplyAt: convRow.last_patient_reply_at,
    priceSentAt: convRow.price_sent_at,
    inboundCount,
    outboundStaffCount,
    lastInboundAt,
    lastOutboundStaffAt,
    firstOutboundStaffAt,
    inboundAfterStaffCount,
    lastMessage: rows.at(-1) ?? null,
    recentMessages: rows.slice(-30),
  };
}

function patientRepliedSince(analysis: ConversationAnalysis, since: Date): boolean {
  if (!analysis.lastInboundAt) return false;
  return new Date(analysis.lastInboundAt).getTime() >= since.getTime();
}

function staffRepliedSince(analysis: ConversationAnalysis, since: Date): boolean {
  if (!analysis.lastOutboundStaffAt) return false;
  return new Date(analysis.lastOutboundStaffAt).getTime() >= since.getTime();
}

/** Conversa já tratada pela equipe (encerrada ou troca longa concluída). */
function isConversationHandled(analysis: ConversationAnalysis): boolean {
  if (analysis.status === "closed") return true;
  if (analysis.outboundStaffCount >= 3 && analysis.inboundCount >= 2) {
    const last = analysis.lastMessage;
    if (last?.direction === "outbound" && last.sent_by) return true;
  }
  return false;
}

function hasRecentBackAndForth(analysis: ConversationAnalysis): boolean {
  const recent = analysis.recentMessages.slice(-6);
  if (recent.length < 3) return false;
  const hasIn = recent.some((m) => m.direction === "inbound");
  const hasStaffOut = recent.some((m) => m.direction === "outbound" && m.sent_by);
  return hasIn && hasStaffOut;
}

/**
 * Lead sem resposta: só lead novo (sem vai-e-volta) e sem “aguarde / já retorno” da equipe.
 * A análise completa (heurística + IA) roda em evaluateLeadNoResponseConversation no agendar/enviar.
 */
export function shouldStartLeadNoResponse(analysis: ConversationAnalysis): FollowUpDecision {
  const gate = heuristicLeadNoResponseGate(analysis);
  if (!gate.eligible) return { ok: false, reason: gate.reason };
  return { ok: true };
}

export function shouldStartLeadPriceSent(
  analysis: ConversationAnalysis,
  outboundText: string,
): FollowUpDecision {
  if (!detectPriceInMessage(outboundText)) return { ok: false, reason: "sem_valor_na_mensagem" };
  if (analysis.status === "closed") return { ok: false, reason: "conversa_encerrada" };
  if (isConversationHandled(analysis)) return { ok: false, reason: "conversa_ja_tratada" };
  if (!analysis.lastInboundAt) return { ok: false, reason: "paciente_nunca_escreveu" };
  if (analysis.lastMessage?.direction !== "outbound" || !analysis.lastMessage.sent_by) {
    return { ok: false, reason: "ultima_mensagem_nao_e_resposta_da_equipe" };
  }
  return { ok: true };
}

/**
 * True se o paciente teve consulta (agendada/confirmada/concluída/em andamento)
 * depois da consulta de origem da reativação.
 */
async function patientHadConsultationSinceSource(input: {
  tenantId: string;
  patientId?: string | null;
  sourceAppointmentId: string;
}): Promise<boolean> {
  const { data: source } = await supabaseAdmin
    .from("appointments")
    .select("date, start_time, patient_id")
    .eq("id", input.sourceAppointmentId)
    .maybeSingle();
  if (!source) return false;

  const src = source as { date: string; start_time: string | null; patient_id: string };
  const patientId = input.patientId || src.patient_id;
  if (!patientId) return false;

  const { data: rows } = await supabaseAdmin
    .from("appointments")
    .select("id, date, start_time, status")
    .eq("tenant_id", input.tenantId)
    .eq("patient_id", patientId)
    .neq("id", input.sourceAppointmentId)
    .in("status", ["scheduled", "confirmed", "completed", "in_progress"])
    .gte("date", src.date)
    .limit(50);

  return ((rows ?? []) as { id: string; date: string; start_time: string | null }[]).some((row) =>
    appointmentOccursAfter(row, src),
  );
}

/**
 * Interação que bloqueia reativação: paciente respondeu no CRM ou equipe humana escreveu.
 * Mensagens automáticas (ex.: aniversário, follow-ups) têm sent_by null e não contam.
 */
function hadReactivationBlockingChatActivity(
  analysis: ConversationAnalysis,
  since: Date,
): { blocked: boolean; reason?: string } {
  if (patientRepliedSince(analysis, since)) {
    return { blocked: true, reason: "paciente_respondeu" };
  }
  if (staffRepliedSince(analysis, since)) {
    return { blocked: true, reason: "equipe_ja_acompanhou" };
  }
  return { blocked: false };
}

/**
 * True se deve pular o passo 7d/15d/30d:
 * - houve consulta concluída/em andamento depois da original; ou
 * - há consulta agendada/confirmada na semana vigente (seg–dom) do envio.
 */
async function shouldSkipPostConsultationIntervalStep(input: {
  tenantId: string;
  patientId?: string | null;
  sourceAppointmentId: string;
}): Promise<{ skip: boolean; reason?: string }> {
  const { data: source } = await supabaseAdmin
    .from("appointments")
    .select("date, start_time, patient_id")
    .eq("id", input.sourceAppointmentId)
    .maybeSingle();
  if (!source) return { skip: false };

  const src = source as { date: string; start_time: string | null; patient_id: string };
  const patientId = input.patientId || src.patient_id;
  if (!patientId) return { skip: false };

  const { data: attendedRows } = await supabaseAdmin
    .from("appointments")
    .select("id, date, start_time, status")
    .eq("tenant_id", input.tenantId)
    .eq("patient_id", patientId)
    .neq("id", input.sourceAppointmentId)
    .in("status", [...POST_CONSULTATION_ATTENDED_STATUSES])
    .gte("date", src.date)
    .limit(50);

  const hadAttended = (
    (attendedRows ?? []) as { id: string; date: string; start_time: string | null }[]
  ).some((row) => appointmentOccursAfter(row, src));
  if (hadAttended) {
    return { skip: true, reason: "nova_consulta_no_periodo" };
  }

  const weekStart = startOfWeekMonday(todayISO());
  const weekEnd = shiftDate(weekStart, 6);
  const { data: bookedRows } = await supabaseAdmin
    .from("appointments")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("patient_id", patientId)
    .neq("id", input.sourceAppointmentId)
    .in("status", [...POST_CONSULTATION_BOOKED_STATUSES])
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .limit(1);

  if ((bookedRows ?? []).length > 0) {
    return { skip: true, reason: "consulta_agendada_na_semana" };
  }

  return { skip: false };
}

/** Triggers que NÃO cancelam por resposta do paciente / chat fechado (enviam no horário). */
const INTERACTION_IMMUNE_TRIGGERS = new Set(["appointment_booked", "nps", "no_show"]);

/** Pós-consulta 1 dia: sempre envia, independente de interação no WhatsApp. */
const POST_CONSULTATION_ALWAYS_SEND_STEP = "post_consultation_24h";

function isInteractionImmuneTrigger(triggerType: string): boolean {
  return INTERACTION_IMMUNE_TRIGGERS.has(triggerType);
}

function isAlwaysSendFollowUpStep(triggerType: string, stepKey: string): boolean {
  return (
    isInteractionImmuneTrigger(triggerType) ||
    (triggerType === "post_consultation" && stepKey === POST_CONSULTATION_ALWAYS_SEND_STEP)
  );
}

async function shouldSendFollowUpStep(input: {
  tenantId: string;
  conversationId: string;
  triggerType: string;
  runStartedAt: string;
  appointmentId?: string | null;
  patientId?: string | null;
  stepKey: string;
}): Promise<FollowUpDecision> {
  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return { ok: false, reason: "conversa_nao_encontrada", cancelRun: true };

  const runStarted = new Date(input.runStartedAt);
  const alwaysSend = isAlwaysSendFollowUpStep(input.triggerType, input.stepKey);

  if (!alwaysSend && analysis.status === "closed") {
    return { ok: false, reason: "conversa_encerrada", cancelRun: true };
  }

  // Reativação: resposta do paciente ou da equipe cancela o ciclo (tratado no case).
  // Automáticas (aniversário etc.) não contam — sent_by null.
  // NPS, confirmação/lembretes e pós 1 dia: enviam mesmo com interação.
  // Falta 2h: sempre; D+1 trata resposta no case no_show.
  const skipGlobalPatientReplyGate =
    alwaysSend ||
    (input.triggerType === "no_show" && input.stepKey === "no_show_2h") ||
    input.triggerType === "reactivation";

  if (
    !skipGlobalPatientReplyGate &&
    patientRepliedSince(analysis, runStarted)
  ) {
    return { ok: false, reason: "paciente_respondeu", cancelRun: true };
  }

  // Confirmação / NPS / falta / pós 1 dia: reabre conversa fechada antes de enviar
  if (alwaysSend && analysis.status === "closed") {
    await reopenConversationForOutbound(input.conversationId);
  }

  switch (input.triggerType) {
    case "lead_no_response": {
      // Paciente respondeu → cancela (já coberto no gate global).
      // Equipe mandou outra mensagem → cancela este ciclo (um novo pode ter sido reagendado).
      if (staffRepliedSince(analysis, runStarted)) {
        return { ok: false, reason: "equipe_respondeu_de_novo", cancelRun: true };
      }
      if (
        analysis.lastInboundAt &&
        analysis.lastOutboundStaffAt &&
        new Date(analysis.lastInboundAt) >= new Date(analysis.lastOutboundStaffAt)
      ) {
        return { ok: false, reason: "paciente_respondeu", cancelRun: true };
      }
      // Só novas CVs: analisa se ainda é lead sumido (não “aguarde / já retorno”).
      const leadGate = await evaluateLeadNoResponseConversation({ analysis });
      if (!leadGate.eligible) {
        return { ok: false, reason: leadGate.reason, cancelRun: true };
      }
      break;
    }
    case "lead_price_sent": {
      // Automação desativada — cancela ciclos antigos ainda pendentes.
      return { ok: false, reason: "lead_price_sent_desativado", cancelRun: true };
    }
    case "appointment_booked": {
      if (!input.appointmentId) break;
      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .select("status, date, start_time")
        .eq("id", input.appointmentId)
        .maybeSingle();
      if (!appt) return { ok: false, reason: "consulta_nao_encontrada", cancelRun: true };
      const status = (appt as { status: string }).status;
      if (status === "cancelled" || status === "rescheduled") {
        return { ok: false, reason: "consulta_cancelada", cancelRun: true };
      }
      if (status === "completed" || status === "no_show") {
        return { ok: false, reason: "consulta_ja_ocorreu", cancelRun: true };
      }
      if (
        input.stepKey === "appointment_reminder_morning" ||
        input.stepKey === "appointment_reminder_3h"
      ) {
        return { ok: false, reason: "lembrete_no_dia_desativado", cancelRun: false };
      }
      break;
    }
    case "post_consultation": {
      // 1 dia: sempre envia (já passou pelos gates alwaysSend).
      if (input.stepKey === POST_CONSULTATION_ALWAYS_SEND_STEP) {
        break;
      }
      if (staffRepliedSince(analysis, runStarted)) {
        return { ok: false, reason: "equipe_ja_acompanhou", cancelRun: true };
      }
      if (hasRecentBackAndForth(analysis)) {
        return { ok: false, reason: "conversa_ativa", cancelRun: true };
      }
      // 7d / 15d / 30d: só se não houve outra consulta desde a original
      // e se não há consulta agendada/confirmada na semana vigente (seg–dom).
      if (POST_CONSULTATION_NO_INTERVENING_STEPS.has(input.stepKey) && input.appointmentId) {
        const gate = await shouldSkipPostConsultationIntervalStep({
          tenantId: input.tenantId,
          patientId: input.patientId,
          sourceAppointmentId: input.appointmentId,
        });
        if (gate.skip) {
          return { ok: false, reason: gate.reason ?? "nova_consulta_no_periodo", cancelRun: false };
        }
      }
      break;
    }
    case "reactivation": {
      const chatGate = hadReactivationBlockingChatActivity(analysis, runStarted);
      if (chatGate.blocked) {
        return { ok: false, reason: chatGate.reason ?? "interacao_no_periodo", cancelRun: true };
      }
      if (input.appointmentId) {
        const hadConsult = await patientHadConsultationSinceSource({
          tenantId: input.tenantId,
          patientId: input.patientId,
          sourceAppointmentId: input.appointmentId,
        });
        if (hadConsult) {
          return { ok: false, reason: "consulta_no_periodo", cancelRun: true };
        }
      }
      break;
    }
    case "nps": {
      if (!input.appointmentId) break;
      const { data: survey } = await supabaseAdmin
        .from("nps_surveys" as never)
        .select("status")
        .eq("appointment_id", input.appointmentId)
        .maybeSingle();
      const surveyStatus = (survey as { status?: string } | null)?.status;
      // Só cancela por “já respondido” no NPS interno do sistema.
      if (survey && surveyStatus === "answered") {
        return { ok: false, reason: "nps_ja_respondido", cancelRun: true };
      }
      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .select("status")
        .eq("id", input.appointmentId)
        .maybeSingle();
      if ((appt as { status?: string } | null)?.status !== "completed") {
        return { ok: false, reason: "consulta_nao_concluida", cancelRun: true };
      }
      break;
    }
    case "no_show": {
      if (!input.appointmentId) break;
      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .select("status")
        .eq("id", input.appointmentId)
        .maybeSingle();
      if ((appt as { status?: string } | null)?.status !== "no_show") {
        return { ok: false, reason: "falta_nao_confirmada", cancelRun: true };
      }
      // D+1 só se o paciente não respondeu no WhatsApp após marcar Faltou / após o aviso de 2h.
      if (
        input.stepKey === "no_show_next_day" &&
        patientRepliedSince(analysis, runStarted)
      ) {
        return { ok: false, reason: "paciente_respondeu", cancelRun: true };
      }
      break;
    }
    default:
      break;
  }

  return { ok: true };
}

async function skipFollowUpStep(
  scheduleId: string,
  reason: string,
  runId?: string,
  cancelRun = false,
) {
  await supabaseAdmin
    .from("wa_follow_up_schedules" as never)
    .update({ status: "skipped", error_message: reason } as never)
    .eq("id", scheduleId);

  if (cancelRun && runId) {
    const now = new Date().toISOString();
    await supabaseAdmin
      .from("wa_follow_up_runs" as never)
      .update({ status: "cancelled", cancelled_at: now, cancel_reason: reason } as never)
      .eq("id", runId)
      .eq("status", "active");
    await supabaseAdmin
      .from("wa_follow_up_schedules" as never)
      .update({ status: "cancelled" } as never)
      .eq("run_id", runId)
      .eq("status", "pending");
  }
}

export async function cancelFollowUpsOnConversationClose(tenantId: string, conversationId: string) {
  await cancelActiveFollowUpRuns({
    tenantId,
    conversationId,
    // Confirmação/lembretes, NPS, falta e pós-consulta (1 dia precisa sobreviver;
    // 7/15/30 ainda respeitam interação no momento do envio).
    excludeTriggerTypes: ["appointment_booked", "nps", "no_show", "post_consultation"],
    reason: "conversa_encerrada",
  });
}

export async function cancelActiveFollowUpRuns(input: {
  tenantId: string;
  conversationId?: string;
  patientId?: string;
  appointmentId?: string;
  triggerTypes?: string[];
  excludeTriggerTypes?: string[];
  reason: string;
}) {
  let q = supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .select("id, trigger_type")
    .eq("tenant_id", input.tenantId)
    .eq("status", "active");

  if (input.conversationId) q = q.eq("conversation_id", input.conversationId);
  if (input.patientId) q = q.eq("patient_id", input.patientId);
  if (input.appointmentId) q = q.eq("appointment_id", input.appointmentId);
  if (input.triggerTypes?.length) q = q.in("trigger_type", input.triggerTypes);

  const { data: runs } = await q;
  const exclude = new Set(input.excludeTriggerTypes ?? []);
  const runIds = ((runs ?? []) as { id: string; trigger_type?: string }[])
    .filter((r) => !exclude.has(r.trigger_type ?? ""))
    .map((r) => r.id);
  if (!runIds.length) return;

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .update({ status: "cancelled", cancelled_at: now, cancel_reason: input.reason } as never)
    .in("id", runIds);

  await supabaseAdmin
    .from("wa_follow_up_schedules" as never)
    .update({ status: "cancelled" } as never)
    .in("run_id", runIds)
    .eq("status", "pending");
}

async function resolveFollowUpTemplateContext(input: {
  tenantId: string;
  patientId?: string | null;
  conversationId?: string | null;
  appointmentId?: string | null;
}): Promise<TemplateContext> {
  const ctx: TemplateContext = { tenantName: await getTenantName(input.tenantId) };

  let patientId = input.patientId ?? null;
  if (!patientId && input.conversationId) {
    const { data: conv } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("patient_id, contact_name")
      .eq("id", input.conversationId)
      .maybeSingle();
    patientId = (conv as { patient_id?: string | null } | null)?.patient_id ?? null;
    ctx.patientName = (conv as { contact_name?: string | null } | null)?.contact_name;
  }

  if (patientId) {
    const { data: patientRow } = await supabaseAdmin
      .from("patients")
      .select("gender, full_name")
      .eq("id", patientId)
      .maybeSingle();
    if (patientRow) {
      ctx.patientGender = patientRow.gender;
      ctx.patientName = patientRow.full_name ?? ctx.patientName;
    }
  }

  if (input.appointmentId) {
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("date, start_time, professional_id")
      .eq("id", input.appointmentId)
      .maybeSingle();
    if (appt) {
      const apptRow = appt as { date?: string | null; start_time?: string | null };
      if (apptRow.date && apptRow.start_time) {
        ctx.appointmentAt = zonedDateFromWallClock(
          String(apptRow.date),
          String(apptRow.start_time),
        );
      }
      const profId = (appt as { professional_id?: string | null }).professional_id;
      if (profId) {
        const { data: professional } = await supabaseAdmin
          .from("profiles")
          .select("full_name, display_name")
          .eq("id", profId)
          .maybeSingle();
        ctx.professionalName = professionalDisplayName(professional);
      }
    }
  }

  return ctx;
}

async function createManualTask(input: {
  tenantId: string;
  conversationId?: string | null;
  patientId?: string | null;
  assignedTo: string;
  title: string;
  description: string;
  dueAt: string;
  createdBy?: string | null;
}) {
  const reminderNote = input.description.trim()
    ? `${input.title}\n\n${input.description.trim()}`
    : input.title;

  const { data: task, error } = await supabaseAdmin
    .from("wa_tasks" as never)
    .insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId ?? null,
      patient_id: input.patientId ?? null,
      title: input.title,
      description: input.description,
      assigned_to: input.assignedTo,
      due_at: input.dueAt,
      priority: "normal",
      task_type: "follow_up",
      created_by: input.createdBy ?? input.assignedTo,
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: reminderErr } = await supabaseAdmin.from("wa_reminders" as never).insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId ?? null,
    patient_id: input.patientId ?? null,
    assigned_to: input.assignedTo,
    remind_at: input.dueAt,
    note: reminderNote,
    created_by: input.createdBy ?? input.assignedTo,
    task_id: (task as { id: string }).id,
  } as never);
  if (reminderErr) throw new Error(reminderErr.message);
}

export async function scheduleFollowUpRun(input: {
  tenantId: string;
  triggerType: string;
  sequenceKey: string;
  conversationId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  createdBy?: string | null;
  baseTime?: Date;
  metadata?: Record<string, unknown>;
  templateContext?: TemplateContext;
  onlyStepKeys?: string[];
}) {
  const steps = (await getFollowUpSequencesServer(input.tenantId))[input.sequenceKey];
  if (!steps?.length) return null;

  const base = input.baseTime ?? new Date();
  const tenantName = await getTenantName(input.tenantId);
  const ctx: TemplateContext = {
    tenantName,
    ...input.templateContext,
  };

  if (!ctx.patientGender && input.patientId) {
    const { data: patientRow } = await supabaseAdmin
      .from("patients")
      .select("gender, full_name")
      .eq("id", input.patientId)
      .maybeSingle();
    if (patientRow) {
      ctx.patientGender = patientRow.gender;
      if (!ctx.patientName) ctx.patientName = patientRow.full_name;
    }
  } else if (!ctx.patientGender && input.conversationId) {
    const { data: convRow } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("patient_id")
      .eq("id", input.conversationId)
      .maybeSingle();
    const linkedPatientId = (convRow as { patient_id?: string | null } | null)?.patient_id;
    if (linkedPatientId) {
      const { data: patientRow } = await supabaseAdmin
        .from("patients")
        .select("gender, full_name")
        .eq("id", linkedPatientId)
        .maybeSingle();
      if (patientRow) {
        ctx.patientGender = patientRow.gender;
        if (!ctx.patientName) ctx.patientName = patientRow.full_name;
      }
    }
  }

  if (input.appointmentId) {
    // Sequências ligadas a uma consulta (lembretes, pós-consulta, no-show, NPS)
    // devem substituir apenas a sequência da MESMA consulta. Cancelar por paciente
    // apagaria os lembretes de outras consultas futuras do mesmo paciente.
    await cancelActiveFollowUpRuns({
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      triggerTypes: [input.triggerType],
      reason: "replaced_by_new_sequence",
    });
  } else if (input.conversationId || input.patientId) {
    await cancelActiveFollowUpRuns({
      tenantId: input.tenantId,
      conversationId: input.conversationId ?? undefined,
      patientId: input.patientId ?? undefined,
      triggerTypes: [input.triggerType],
      reason: "replaced_by_new_sequence",
    });
  }

  const { data: run, error: runErr } = await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .insert({
      tenant_id: input.tenantId,
      trigger_type: input.triggerType,
      patient_id: input.patientId ?? null,
      conversation_id: input.conversationId ?? null,
      appointment_id: input.appointmentId ?? null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    } as never)
    .select("id")
    .single();
  if (runErr) throw new Error(runErr.message);
  const runId = (run as { id: string }).id;

  const receptionId = await getDefaultReceptionAssignee(input.tenantId);
  const rows: Record<string, unknown>[] = [];

  for (const [idx, step] of steps.entries()) {
    if (input.onlyStepKeys?.length && !input.onlyStepKeys.includes(step.key)) continue;

    let scheduledAt: Date;
    if (step.delayMinutes < 0 && ctx.appointmentAt) {
      const relative = resolveAppointmentRelativeSchedule(
        step.key,
        step.delayMinutes,
        ctx.appointmentAt,
        base,
      );
      if (!relative) continue;
      scheduledAt = relative;
    } else if (step.delayMinutes < 0) {
      continue;
    } else {
      scheduledAt = new Date(base.getTime() + step.delayMinutes * 60_000);
    }

    scheduledAt = ensureScheduledInMessagingWindow(scheduledAt, base);
    // Lembrete relativo não pode cair no/após o horário da consulta após o clamp.
    if (
      step.delayMinutes < 0 &&
      ctx.appointmentAt &&
      scheduledAt.getTime() >= ctx.appointmentAt.getTime()
    ) {
      continue;
    }

    const { template: chosenTemplate } = await pickAndAdvanceMessageVariant({
      tenantId: input.tenantId,
      stepKey: step.key,
      patientId: input.patientId,
      conversationId: input.conversationId,
      templates: step.templates,
    });
    const rendered = renderFollowUpMessage(chosenTemplate, ctx);
    rows.push({
      tenant_id: input.tenantId,
      run_id: runId,
      step_key: step.key,
      sequence_order: idx,
      mode: step.mode,
      scheduled_at: scheduledAt.toISOString(),
      message_template: chosenTemplate,
      rendered_message: rendered,
      conversation_id: input.conversationId ?? null,
      patient_id: input.patientId ?? null,
      appointment_id: input.appointmentId ?? null,
      assigned_to: step.mode === "manual" ? receptionId : null,
    });
  }

  if (rows.length) {
    const { error } = await supabaseAdmin.from("wa_follow_up_schedules" as never).insert(rows as never);
    if (error) throw new Error(error.message);
  }

  return runId;
}

/** Agenda envio do pedido de avaliação (NPS do sistema ou link externo) após a consulta. */
async function patientHasPriorNpsResponse(tenantId: string, patientId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("nps_surveys" as never)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("patient_id", patientId)
    .eq("status", "answered")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function scheduleNpsWhatsApp(input: {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  conversationId: string | null;
  npsToken?: string | null;
  patientName?: string | null;
}) {
  let conversationId = input.conversationId;
  let patientName = input.patientName ?? null;

  // Sem conversa WhatsApp: cria pelo telefone do paciente e envia o NPS nessa CV nova.
  if (!conversationId) {
    const conv = await ensureOutboundConversationForPatient(input.tenantId, input.patientId);
    if (!conv?.id) {
      console.warn(
        "[CRM] NPS: paciente sem telefone/WhatsApp — não foi possível abrir conversa",
        input.patientId,
      );
      return;
    }
    conversationId = conv.id;
    patientName = patientName ?? conv.contact_name;
  }

  const settings = await getNpsSettingsServer(input.tenantId);
  const clinicName = await getTenantName(input.tenantId);

  if (settings.mode === "external") {
    if (!settings.externalUrl) {
      console.warn("[CRM] NPS externo sem URL configurada — envio ignorado");
      return;
    }
  } else if (!input.npsToken) {
    return;
  }

  const hasEvaluatedBefore = await patientHasPriorNpsResponse(input.tenantId, input.patientId);
  const systemNpsUrl = input.npsToken ? `${getPublicAppUrl()}/nps/${input.npsToken}` : "";
  const template = pickNpsMessageTemplate(settings, hasEvaluatedBefore);
  const npsText = renderNpsMessage(
    template,
    buildNpsTemplateVars({
      patientName,
      clinicName,
      systemNpsUrl,
      externalUrl: settings.externalUrl,
    }),
  );
  if (!npsText) return;

  const dedupeNeedle =
    settings.mode === "external"
      ? settings.externalUrl
      : input.npsToken
        ? `/nps/${input.npsToken}`
        : "";

  if (dedupeNeedle) {
    const { data: priorNpsMsg } = await supabaseAdmin
      .from("wa_messages" as never)
      .select("id, body")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .ilike("body", `%${dedupeNeedle}%`)
      .limit(1)
      .maybeSingle();
    if (priorNpsMsg) return;
  }

  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    appointmentId: input.appointmentId,
    triggerTypes: ["nps"],
    reason: "nps_reagendado",
  });

  const delayMinutes = settings.delayMinutes ?? NPS_SEND_DELAY_MINUTES;
  const scheduledAt = ensureScheduledInMessagingWindow(
    new Date(Date.now() + delayMinutes * 60_000),
  );

  const { data: run, error: runErr } = await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .insert({
      tenant_id: input.tenantId,
      trigger_type: "nps",
      patient_id: input.patientId,
      conversation_id: conversationId,
      appointment_id: input.appointmentId,
      metadata: {
        nps_token: input.npsToken ?? null,
        nps_mode: settings.mode,
        nps_variant: hasEvaluatedBefore ? "returning" : "first",
        external_url: settings.mode === "external" ? settings.externalUrl : null,
      },
    } as never)
    .select("id")
    .single();
  if (runErr) throw new Error(runErr.message);

  const runId = (run as { id: string }).id;
  const { error: schedErr } = await supabaseAdmin.from("wa_follow_up_schedules" as never).insert({
    tenant_id: input.tenantId,
    run_id: runId,
    step_key: NPS_STEP_KEY,
    sequence_order: 0,
    mode: "auto",
    scheduled_at: scheduledAt.toISOString(),
    message_template: npsText,
    rendered_message: npsText,
    conversation_id: conversationId,
    patient_id: input.patientId,
    appointment_id: input.appointmentId,
  } as never);
  if (schedErr) throw new Error(schedErr.message);
}

async function sendAutomatedMessage(
  tenantId: string,
  conversationId: string,
  text: string,
  meta?: { stepKey?: string; runId?: string; triggerType?: string },
): Promise<{ waMessageId: string; messageRowId: string } | null> {
  if (!isWhatsAppConfigured()) return null;

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("contact_phone, channel")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const convRow = conv as { contact_phone: string; channel?: string };
  if ((convRow.channel ?? "whatsapp") !== "whatsapp") return null;

  const outboundText = await normalizeManualOutboundMessage(
    tenantId,
    normalizeOutboundMessageBody(text),
    { conversationId },
  );

  const phone = normalizeWaPhone(convRow.contact_phone);
  if (!phone) return null;
  const result = await providerSendText(phone, outboundText);
  const now = new Date();

  await insertWaMessage({
    tenantId,
    conversationId,
    waMessageId: result.messageId,
    direction: "outbound",
    messageType: "text",
    body: outboundText,
    status: "sent",
    sentBy: null,
    sentAt: now,
    rawPayload: { source: "follow_up_automation" },
  });

  const { data: msgRow } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id")
    .eq("wa_message_id", result.messageId)
    .maybeSingle();

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({
      last_message_at: now.toISOString(),
      last_message_preview: outboundText.slice(0, 120),
      updated_at: now.toISOString(),
    } as never)
    .eq("id", conversationId);

  logAuditSafe({
    tenantId,
    category: "whatsapp",
    action: "whatsapp.message_auto_sent",
    summary: `Mensagem automática enviada (Z-API): ${outboundText.slice(0, 100)}`,
    entityType: "conversation",
    entityId: conversationId,
    conversationId,
    details: {
      wa_message_id: result.messageId,
      step_key: meta?.stepKey,
      run_id: meta?.runId,
      trigger_type: meta?.triggerType,
      preview: outboundText.slice(0, 200),
    },
    source: "automation",
  });

  return {
    waMessageId: result.messageId,
    messageRowId: (msgRow as { id: string } | null)?.id ?? "",
  };
}

/** Reserva o passo antes de enviar — evita duplicata quando cron, webhook e inbox rodam juntos. */
async function claimFollowUpSchedule(scheduleId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("wa_follow_up_schedules" as never)
    .update({ status: "sent", sent_at: new Date().toISOString() } as never)
    .eq("id", scheduleId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  return !!data;
}

async function failFollowUpSchedule(scheduleId: string, errorMessage: string) {
  await supabaseAdmin
    .from("wa_follow_up_schedules" as never)
    .update({ status: "failed", error_message: errorMessage } as never)
    .eq("id", scheduleId);
}

async function attachFollowUpMessage(scheduleId: string, waMessageRowId: string | null) {
  if (!waMessageRowId) return;
  await supabaseAdmin
    .from("wa_follow_up_schedules" as never)
    .update({ wa_message_id: waMessageRowId } as never)
    .eq("id", scheduleId);
}

export async function processDueFollowUps(
  limit = 30,
  options?: { runId?: string },
): Promise<{ processed: number; sent: number; manual: number; failed: number; skipped: number }> {
  const now = new Date().toISOString();
  let q = supabaseAdmin
    .from("wa_follow_up_schedules" as never)
    .select(
      "id, tenant_id, run_id, step_key, mode, rendered_message, conversation_id, patient_id, assigned_to, message_template, appointment_id, wa_follow_up_runs!inner(trigger_type, started_at, status)",
    )
    .eq("status", "pending")
    .eq("wa_follow_up_runs.status", "active")
    .lte("scheduled_at", now)
    .order("scheduled_at")
    .limit(limit);

  if (options?.runId) {
    q = q.eq("run_id", options.runId);
  }

  const { data: due } = await q;

  let sent = 0;
  let manual = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of (due ?? []) as {
    id: string;
    tenant_id: string;
    run_id: string;
    step_key: string;
    mode: FollowUpMode;
    rendered_message: string | null;
    conversation_id: string | null;
    patient_id: string | null;
    assigned_to: string | null;
    message_template: string;
    appointment_id: string | null;
    wa_follow_up_runs: { trigger_type: string; started_at: string; status: string };
  }[]) {
    try {
      const nowDate = new Date();
      if (!isWithinMessagingWindow(nowDate)) {
        const nextAt = nextMessagingWindowStart(nowDate);
        await supabaseAdmin
          .from("wa_follow_up_schedules" as never)
          .update({ scheduled_at: nextAt.toISOString() } as never)
          .eq("id", row.id)
          .eq("status", "pending");
        skipped++;
        continue;
      }

      const run = row.wa_follow_up_runs;

      // Sempre resolve a conversa pelo telefone ATUAL do paciente (evita número antigo).
      let conversationId = row.conversation_id;
      if (row.patient_id) {
        const currentConv = await ensureOutboundConversationForPatient(
          row.tenant_id,
          row.patient_id,
        );
        if (currentConv && currentConv.id !== conversationId) {
          await supabaseAdmin
            .from("wa_follow_up_schedules" as never)
            .update({ conversation_id: currentConv.id } as never)
            .eq("id", row.id);
          conversationId = currentConv.id;
        } else if (currentConv) {
          conversationId = currentConv.id;
        }
      }

      if (conversationId) {
        const decision = await shouldSendFollowUpStep({
          tenantId: row.tenant_id,
          conversationId,
          triggerType: run.trigger_type,
          runStartedAt: run.started_at,
          appointmentId: row.appointment_id,
          patientId: row.patient_id,
          stepKey: row.step_key,
        });
        if (!decision.ok) {
          await skipFollowUpStep(row.id, decision.reason, row.run_id, decision.cancelRun);
          skipped++;
          continue;
        }
      }

      if (row.mode === "manual") {
        if (!(await claimFollowUpSchedule(row.id))) {
          skipped++;
          continue;
        }
        const assignee = row.assigned_to ?? (await getDefaultReceptionAssignee(row.tenant_id));
        const manualCtx = await resolveFollowUpTemplateContext({
          tenantId: row.tenant_id,
          patientId: row.patient_id,
          conversationId,
          appointmentId: row.appointment_id,
        });
        const manualText = renderFollowUpMessage(row.message_template, manualCtx);
        if (assignee) {
          await createManualTask({
            tenantId: row.tenant_id,
            conversationId,
            patientId: row.patient_id,
            assignedTo: assignee,
            title: `Follow-up: ${row.step_key.replace(/_/g, " ")}`,
            description: manualText,
            dueAt: now,
          });
        }
        manual++;
        continue;
      }

      if (!conversationId || !row.message_template) {
        await supabaseAdmin
          .from("wa_follow_up_schedules" as never)
          .update({ status: "skipped", error_message: "Sem conversa WhatsApp vinculada" } as never)
          .eq("id", row.id)
          .eq("status", "pending");
        skipped++;
        continue;
      }

      if (!(await claimFollowUpSchedule(row.id))) {
        skipped++;
        continue;
      }

      const sendCtx = await resolveFollowUpTemplateContext({
        tenantId: row.tenant_id,
        patientId: row.patient_id,
        conversationId,
        appointmentId: row.appointment_id,
      });
      const textToSend =
        row.step_key === NPS_STEP_KEY
          ? (row.rendered_message ?? row.message_template)
          : renderFollowUpMessage(row.message_template, sendCtx);

      const result = await sendAutomatedMessage(
        row.tenant_id,
        conversationId,
        textToSend,
        {
          stepKey: row.step_key,
          runId: row.run_id,
          triggerType: (row as { wa_follow_up_runs?: { trigger_type?: string } }).wa_follow_up_runs?.trigger_type,
        },
      );
      if (!result) {
        await failFollowUpSchedule(row.id, "WhatsApp não configurado ou indisponível");
        failed++;
        continue;
      }

      await attachFollowUpMessage(row.id, result.messageRowId || null);

      if (row.step_key === NPS_STEP_KEY && row.appointment_id) {
        await supabaseAdmin
          .from("nps_surveys" as never)
          .update({ status: "sent", sent_at: new Date().toISOString() } as never)
          .eq("appointment_id", row.appointment_id)
          .in("status", ["pending"]);
        await supabaseAdmin
          .from("wa_follow_up_runs" as never)
          .update({ status: "completed", completed_at: new Date().toISOString() } as never)
          .eq("id", row.run_id);
      }

      if (
        row.step_key === "appointment_reminder_24h" ||
        row.step_key === "appointment_booked_now"
      ) {
        const confirmationType =
          row.step_key === "appointment_reminder_24h" ? "d1_reminder" : "booking";
        if (row.appointment_id) {
          await supabaseAdmin.from("appointment_confirmations" as never).insert({
            tenant_id: row.tenant_id,
            appointment_id: row.appointment_id,
            patient_id: row.patient_id,
            channel: "whatsapp",
            confirmation_type: confirmationType,
            status: "sent",
            message_preview: textToSend.slice(0, 200),
          } as never);
        }
      }

      await logCrmEvent({
        tenantId: row.tenant_id,
        eventType: "follow_up_sent",
        conversationId,
        patientId: row.patient_id,
        metadata: { step_key: row.step_key, run_id: row.run_id },
      });

      logAuditSafe({
        tenantId: row.tenant_id,
        category: "whatsapp",
        action: "whatsapp.follow_up_sent",
        summary: `Follow-up automático enviado: ${row.step_key.replace(/_/g, " ")}`,
        entityType: "follow_up_schedule",
        entityId: row.id,
        patientId: row.patient_id,
        conversationId,
        details: {
          step_key: row.step_key,
          run_id: row.run_id,
          message_preview: row.rendered_message?.slice(0, 200),
        },
        source: "cron",
      });

      sent++;
    } catch (e) {
      await failFollowUpSchedule(row.id, (e as Error).message);
      failed++;
    }
  }

  return { processed: (due ?? []).length, sent, manual, failed, skipped };
}

export async function onInboundMessageForFollowUp(input: {
  tenantId: string;
  conversationId: string;
  patientName?: string | null;
  isFirstInbound?: boolean;
}) {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ last_patient_reply_at: now } as never)
    .eq("id", input.conversationId);

  // Interrompe follow-ups sensíveis a resposta (lead, reativação…).
  // Confirmação/lembretes, NPS, falta e pós-consulta NÃO cancelam aqui —
  // pós 1 dia envia sempre; 7/15/30 avaliam interação só na hora do envio.
  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    excludeTriggerTypes: ["appointment_booked", "nps", "no_show", "post_consultation"],
    reason: "patient_replied",
  });
}

export async function onOutboundMessageForFollowUp(input: {
  tenantId: string;
  conversationId: string;
  text: string;
  userId?: string | null;
}) {
  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return;

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("patient_id, contact_name, price_sent_at")
    .eq("id", input.conversationId)
    .maybeSingle();

  // Lead sem resposta: só CV nova; analisa conversa (heurística + IA) antes de agendar.
  const leadGate = await evaluateLeadNoResponseConversation({ analysis });
  if (leadGate.eligible) {
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "lead_no_response",
      sequenceKey: "lead_no_response",
      conversationId: input.conversationId,
      patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
      createdBy: input.userId ?? null,
      baseTime: new Date(),
      templateContext: {
        patientName: (conv as { contact_name?: string | null } | null)?.contact_name,
      },
    });
  } else {
    await cancelActiveFollowUpRuns({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      triggerTypes: ["lead_no_response"],
      reason: leadGate.reason || "staff_replied_not_eligible",
    });
  }

  if (!detectPriceInMessage(input.text)) return;

  // Ainda registra preço no funil (CRM), mas não agenda follow-up automático.
  const priceDecision = shouldStartLeadPriceSent(analysis, input.text);
  if (!priceDecision.ok) return;

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ price_sent_at: now } as never)
    .eq("id", input.conversationId);

  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "price_sent",
    conversationId: input.conversationId,
    patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
    userId: input.userId ?? null,
  });

  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    triggerTypes: ["lead_price_sent"],
    reason: "lead_price_sent_disabled",
  });
}

export async function onAppointmentBooked(input: {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  professionalId: string;
  startsAt: Date;
  createdBy?: string | null;
}) {
  const [{ data: patient }, { data: professional }] = await Promise.all([
    supabaseAdmin.from("patients").select("full_name, phone, phone_ddi").eq("id", input.patientId).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name, display_name").eq("id", input.professionalId).maybeSingle(),
  ]);

  const conv = await ensureOutboundConversationForPatient(input.tenantId, input.patientId);

  const { data: existingRun } = await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("appointment_id", input.appointmentId)
    .eq("trigger_type", "appointment_booked")
    .eq("status", "active")
    .maybeSingle();
  if (existingRun) {
    await processDueFollowUps(5, { runId: (existingRun as { id: string }).id });
    return { conversationId: conv?.id ?? null, skipped: true as const };
  }

  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "appointment_booked",
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    conversationId: conv?.id ?? null,
    userId: input.createdBy ?? null,
  });

  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    patientId: input.patientId,
    triggerTypes: ["lead_no_response", "lead_price_sent", "reactivation"],
    reason: "appointment_booked",
  });

  const runId = await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "appointment_booked",
    sequenceKey: "appointment_booked",
    conversationId: conv?.id ?? null,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    createdBy: input.createdBy ?? null,
    baseTime: new Date(),
    templateContext: {
      patientName: patient?.full_name ?? conv?.contact_name,
      professionalName: professionalDisplayName(professional),
      appointmentAt: input.startsAt,
    },
  });

  if (runId) {
    await processDueFollowUps(10, { runId });
  }

  return { conversationId: conv?.id ?? null, runId, skipped: false as const };
}

export async function onAppointmentStatusChange(input: {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  professionalId: string;
  status: string;
  startsAt: Date;
}) {
  if (input.status === "completed") {
    const { data: existingNps } = await supabaseAdmin
      .from("nps_surveys" as never)
      .select("token, status")
      .eq("appointment_id", input.appointmentId)
      .maybeSingle();

    const conv = await ensureOutboundConversationForPatient(input.tenantId, input.patientId);
    const { data: professional } = await supabaseAdmin
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", input.professionalId)
      .maybeSingle();
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("full_name")
      .eq("id", input.patientId)
      .maybeSingle();

    await logCrmEvent({
      tenantId: input.tenantId,
      eventType: "appointment_attended",
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      conversationId: conv?.id ?? null,
    });

    if (!existingNps) {
      await scheduleFollowUpRun({
        tenantId: input.tenantId,
        triggerType: "post_consultation",
        sequenceKey: "post_consultation",
        conversationId: conv?.id ?? null,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        baseTime: new Date(),
        templateContext: {
          patientName: patient?.full_name ?? conv?.contact_name,
          professionalName: professionalDisplayName(professional),
        },
      });
    }

    // Reativação 30/60/90: a partir desta consulta concluída; reinicia se já havia ciclo ativo.
    await cancelActiveFollowUpRuns({
      tenantId: input.tenantId,
      patientId: input.patientId,
      triggerTypes: ["reactivation"],
      reason: "nova_consulta_concluida",
    });
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "reactivation",
      sequenceKey: "reactivation",
      conversationId: conv?.id ?? null,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      baseTime: input.startsAt,
      templateContext: {
        patientName: patient?.full_name ?? conv?.contact_name,
        professionalName: professionalDisplayName(professional),
        appointmentAt: input.startsAt,
      },
    });

    let npsToken = (existingNps as { token?: string } | null)?.token;
    const npsSettings = await getNpsSettingsServer(input.tenantId);

    if (npsSettings.mode === "system") {
      if (!npsToken) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);
        const { data: npsRow } = await supabaseAdmin
          .from("nps_surveys" as never)
          .insert({
            tenant_id: input.tenantId,
            patient_id: input.patientId,
            appointment_id: input.appointmentId,
            professional_id: input.professionalId,
            expires_at: expiresAt.toISOString(),
            status: "pending",
          } as never)
          .select("token")
          .single();
        npsToken = (npsRow as { token?: string } | null)?.token;
      }

      if (npsToken) {
        await scheduleNpsWhatsApp({
          tenantId: input.tenantId,
          appointmentId: input.appointmentId,
          patientId: input.patientId,
          conversationId: conv?.id ?? null,
          npsToken,
          patientName: patient?.full_name ?? conv?.contact_name,
        }).catch((e) => console.error("[CRM] NPS schedule error:", e));
      }
    } else {
      await scheduleNpsWhatsApp({
        tenantId: input.tenantId,
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        conversationId: conv?.id ?? null,
        npsToken: null,
        patientName: patient?.full_name ?? conv?.contact_name,
      }).catch((e) => console.error("[CRM] NPS schedule error:", e));
    }

    return;
  }

  if (input.status === "no_show") {
    const conv = await ensureOutboundConversationForPatient(input.tenantId, input.patientId);
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("full_name")
      .eq("id", input.patientId)
      .maybeSingle();

    await logCrmEvent({
      tenantId: input.tenantId,
      eventType: "appointment_no_show",
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      conversationId: conv?.id ?? null,
    });

    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "no_show",
      sequenceKey: "no_show",
      conversationId: conv?.id ?? null,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      baseTime: new Date(),
      templateContext: {
        patientName: patient?.full_name ?? conv?.contact_name,
        appointmentAt: input.startsAt,
      },
    });
  }
}

export async function setupProfessionalPostConsultFollowUp(input: {
  tenantId: string;
  patientId: string;
  appointmentId?: string | null;
  professionalId: string;
  contactDate: string;
  secretaryNotes: string;
}) {
  const receptionId = await getDefaultReceptionAssignee(input.tenantId);
  if (!receptionId) throw new Error("Nenhuma recepcionista ativa encontrada");

  const conv = await findConversationForPatient(input.tenantId, input.patientId);
  const tagId = await ensureFollowUpTag(
    input.tenantId,
    FOLLOW_UP_TAG_POST_CONSULT.name,
    FOLLOW_UP_TAG_POST_CONSULT.color,
  );

  if (conv?.id) {
    await applyTagToConversation(conv.id, tagId);
  }

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("full_name")
    .eq("id", input.patientId)
    .maybeSingle();
  const { data: professional } = await supabaseAdmin
    .from("profiles")
    .select("full_name, display_name")
    .eq("id", input.professionalId)
    .maybeSingle();

  const dueAt = new Date(`${input.contactDate}T09:00:00`).toISOString();
  const title = `Follow-up pós-consulta — ${patient?.full_name ?? "Paciente"}`;
  const description = input.secretaryNotes.trim() || "Entrar em contato conforme orientação da profissional.";

  await createManualTask({
    tenantId: input.tenantId,
    conversationId: conv?.id ?? null,
    patientId: input.patientId,
    assignedTo: receptionId,
    title,
    description,
    dueAt,
    createdBy: input.professionalId,
  });

  if (conv?.id) {
    await scheduleFollowUpRun({
      tenantId: input.tenantId,
      triggerType: "post_consultation",
      sequenceKey: "post_consultation",
      conversationId: conv.id,
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      createdBy: input.professionalId,
      baseTime: new Date(),
      templateContext: {
        patientName: patient?.full_name ?? conv.contact_name,
        professionalName: professionalDisplayName(professional),
      },
    });
  }

  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "professional_follow_up_scheduled",
    patientId: input.patientId,
    appointmentId: input.appointmentId ?? null,
    conversationId: conv?.id ?? null,
    userId: input.professionalId,
    metadata: { contact_date: input.contactDate, notes: description },
  });

  return { conversationId: conv?.id ?? null, tagId };
}

export async function markConversationObjection(input: {
  tenantId: string;
  conversationId: string;
  objectionType: ObjectionType;
  userId: string;
}) {
  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ objection_type: input.objectionType } as never)
    .eq("id", input.conversationId);

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("patient_id, contact_name")
    .eq("id", input.conversationId)
    .maybeSingle();

  const sequenceKey = `objection_${input.objectionType}` as keyof typeof FOLLOW_UP_SEQUENCES;

  await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "objection",
    sequenceKey,
    conversationId: input.conversationId,
    patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
    createdBy: input.userId,
    templateContext: {
      patientName: (conv as { contact_name?: string | null } | null)?.contact_name,
    },
  });

  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "objection_marked",
    conversationId: input.conversationId,
    patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
    userId: input.userId,
    metadata: { objection_type: input.objectionType },
  });

  const sequences = await getFollowUpSequencesServer(input.tenantId);
  const steps = sequences[sequenceKey];
  return steps?.[0] ? primaryTemplate(steps[0]) : "";
}
