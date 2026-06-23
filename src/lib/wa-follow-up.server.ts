import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fmtDateFromDate, fmtTimeFromDate } from "@/lib/locale";
import { renderTemplate } from "@/lib/settings-helpers";
import { normalizeBrazilPhone, phonesMatch } from "@/lib/wa-phone";
import { getDefaultReceptionAssignee } from "@/lib/wa-crm-assign.server";
import { getFollowUpSequencesServer } from "@/lib/wa-tenant-settings.server";
import {
  FOLLOW_UP_SEQUENCE_DEFAULTS,
  type FollowUpMode,
  type FollowUpStepDef,
} from "@/lib/wa-follow-up-templates";
import { insertWaMessage } from "@/lib/whatsapp-crm-storage.server";
import { logAuditSafe } from "@/lib/audit.server";
import { isWhatsAppConfigured, providerSendText } from "@/lib/whatsapp-provider.server";
import { buildGenderTemplateVars } from "@/lib/wa-template-gender";
import { normalizeOutboundMessageBody } from "@/lib/wa-automation-quick-replies.server";
import { getPublicAppUrl } from "@/lib/app-url";

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

/** Aguarda este tempo após concluir a consulta antes de enviar o NPS por WhatsApp. */
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
  if (!fullName?.trim()) return "tudo bem";
  return fullName.trim().split(/\s+/)[0] ?? fullName;
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

export function buildFollowUpVars(ctx: TemplateContext): Record<string, string> {
  const appt = ctx.appointmentAt ?? null;
  return {
    ...buildGenderTemplateVars(ctx.patientGender),
    primeiro_nome: firstName(ctx.patientName),
    nome_paciente: ctx.patientName?.trim() || "paciente",
    nome_profissional: ctx.professionalName?.trim() || "equipe médica",
    nome_clinica: ctx.tenantName?.trim() || "nossa clínica",
    data_consulta: appt ? fmtDateFromDate(appt) : "{{data_consulta}}",
    hora_consulta: appt ? fmtTimeFromDate(appt) : "{{hora_consulta}}",
  };
}

export function renderFollowUpMessage(template: string, ctx: TemplateContext): string {
  return normalizeOutboundMessageBody(renderTemplate(template, buildFollowUpVars(ctx)));
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

export function resolvePatientPhoneE164(phone: string, phoneDdi?: string | null): string {
  const ddi = (phoneDdi ?? "55").replace(/\D/g, "") || "55";
  const local = phone.replace(/\D/g, "");
  if (!local) return "";
  const combined = local.startsWith(ddi) ? local : `${ddi}${local}`;
  return normalizeBrazilPhone(combined);
}

export async function findConversationForPatient(
  tenantId: string,
  patientId: string,
): Promise<{ id: string; contact_phone: string; contact_name: string | null } | null> {
  const { data: byLink } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, contact_name")
    .eq("tenant_id", tenantId)
    .eq("patient_id", patientId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (byLink) return byLink as { id: string; contact_phone: string; contact_name: string | null };

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("phone, phone_ddi, full_name")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient?.phone) return null;

  const { data: convs } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, contact_name")
    .eq("tenant_id", tenantId);

  const patientPhone = resolvePatientPhoneE164(patient.phone, patient.phone_ddi);
  const match = ((convs ?? []) as { id: string; contact_phone: string; contact_name: string | null }[]).find((c) =>
    phonesMatch(c.contact_phone, patientPhone || patient.phone),
  );
  if (match) {
    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({ patient_id: patientId, contact_name: patient.full_name } as never)
      .eq("id", match.id);
    return match;
  }
  return null;
}

/** Garante conversa WA para envio outbound (cria pelo telefone do paciente se necessário). */
export async function ensureOutboundConversationForPatient(
  tenantId: string,
  patientId: string,
): Promise<{ id: string; contact_phone: string; contact_name: string | null } | null> {
  const existing = await findConversationForPatient(tenantId, patientId);
  if (existing) return existing;

  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("full_name, phone, phone_ddi")
    .eq("id", patientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!patient?.phone?.trim()) return null;

  const phone = resolvePatientPhoneE164(patient.phone, patient.phone_ddi);
  if (!phone) return null;

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
      assigned_to: receptionistId,
      status: "open",
      unread_count: 0,
      last_message_at: now,
      updated_at: now,
    } as never)
    .select("id, contact_phone, contact_name")
    .single();

  if (error) {
    return findConversationForPatient(tenantId, patientId);
  }

  return created as { id: string; contact_phone: string; contact_name: string | null };
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

  for (const m of rows) {
    if (m.direction === "inbound") {
      inboundCount++;
      lastInboundAt = m.created_at;
    } else if (m.sent_by) {
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
    lastMessage: rows.at(-1) ?? null,
    recentMessages: rows.slice(-12),
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

export function shouldStartLeadNoResponse(analysis: ConversationAnalysis): FollowUpDecision {
  if (analysis.status === "closed") return { ok: false, reason: "conversa_encerrada" };
  if (analysis.firstResponseAt) return { ok: false, reason: "equipe_ja_respondeu" };
  if (analysis.outboundStaffCount > 0) return { ok: false, reason: "equipe_ja_respondeu" };
  if (analysis.inboundCount !== 1) return { ok: false, reason: "nao_e_primeiro_contato" };
  if (analysis.lastMessage?.direction !== "inbound") return { ok: false, reason: "ultima_mensagem_nao_e_do_paciente" };
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

async function shouldSendFollowUpStep(input: {
  tenantId: string;
  conversationId: string;
  triggerType: string;
  runStartedAt: string;
  appointmentId?: string | null;
  stepKey: string;
}): Promise<FollowUpDecision> {
  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return { ok: false, reason: "conversa_nao_encontrada", cancelRun: true };

  const runStarted = new Date(input.runStartedAt);

  if (analysis.status === "closed") {
    return { ok: false, reason: "conversa_encerrada", cancelRun: true };
  }

  if (patientRepliedSince(analysis, runStarted)) {
    return { ok: false, reason: "paciente_respondeu", cancelRun: true };
  }

  switch (input.triggerType) {
    case "lead_no_response": {
      if (analysis.firstResponseAt) {
        return { ok: false, reason: "equipe_ja_respondeu", cancelRun: true };
      }
      if (staffRepliedSince(analysis, runStarted)) {
        return { ok: false, reason: "equipe_respondeu", cancelRun: true };
      }
      if (analysis.inboundCount !== 1) {
        return { ok: false, reason: "lead_ja_interagiu", cancelRun: true };
      }
      break;
    }
    case "lead_price_sent": {
      if (!analysis.priceSentAt) return { ok: false, reason: "valor_nao_registrado", cancelRun: true };
      if (patientRepliedSince(analysis, new Date(analysis.priceSentAt))) {
        return { ok: false, reason: "paciente_respondeu_apos_valor", cancelRun: true };
      }
      if (isConversationHandled(analysis)) {
        return { ok: false, reason: "conversa_ja_tratada", cancelRun: true };
      }
      break;
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
      break;
    }
    case "post_consultation":
    case "reactivation": {
      if (staffRepliedSince(analysis, runStarted)) {
        return { ok: false, reason: "equipe_ja_acompanhou", cancelRun: true };
      }
      if (hasRecentBackAndForth(analysis)) {
        return { ok: false, reason: "conversa_ativa", cancelRun: true };
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
      if (surveyStatus === "answered") {
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
    reason: "conversa_encerrada",
  });
}

export async function cancelActiveFollowUpRuns(input: {
  tenantId: string;
  conversationId?: string;
  patientId?: string;
  appointmentId?: string;
  triggerTypes?: string[];
  reason: string;
}) {
  let q = supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("status", "active");

  if (input.conversationId) q = q.eq("conversation_id", input.conversationId);
  if (input.patientId) q = q.eq("patient_id", input.patientId);
  if (input.appointmentId) q = q.eq("appointment_id", input.appointmentId);
  if (input.triggerTypes?.length) q = q.in("trigger_type", input.triggerTypes);

  const { data: runs } = await q;
  const runIds = ((runs ?? []) as { id: string }[]).map((r) => r.id);
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

  if (input.conversationId || input.patientId) {
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
      scheduledAt = new Date(ctx.appointmentAt.getTime() + step.delayMinutes * 60_000);
      if (scheduledAt.getTime() <= Date.now()) continue;
    } else if (step.delayMinutes < 0) {
      continue;
    } else {
      scheduledAt = new Date(base.getTime() + step.delayMinutes * 60_000);
    }

    const rendered = renderFollowUpMessage(step.template, ctx);
    rows.push({
      tenant_id: input.tenantId,
      run_id: runId,
      step_key: step.key,
      sequence_order: idx,
      mode: step.mode,
      scheduled_at: scheduledAt.toISOString(),
      message_template: step.template,
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

function buildNpsMessageText(patientName: string | null | undefined, npsToken: string): string {
  const first = patientName?.trim().split(/\s+/)[0];
  const npsLink = `${getPublicAppUrl()}/nps/${npsToken}`;
  return `Olá${first ? `, ${first}` : ""}! Em uma escala de 0 a 10, o quanto você recomendaria nossa clínica? Responda aqui: ${npsLink}`;
}

/** Agenda envio do NPS por WhatsApp alguns minutos após a conclusão da consulta. */
async function scheduleNpsWhatsApp(input: {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  conversationId: string | null;
  npsToken: string;
  patientName?: string | null;
}) {
  if (!input.conversationId) return;

  const npsText = buildNpsMessageText(input.patientName, input.npsToken);
  const publicUrl = getPublicAppUrl();

  const { data: priorNpsMsg } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id, body")
    .eq("conversation_id", input.conversationId)
    .eq("direction", "outbound")
    .ilike("body", `%/nps/${input.npsToken}%`)
    .limit(1)
    .maybeSingle();
  const priorBody = (priorNpsMsg as { body?: string } | null)?.body ?? "";
  if (priorNpsMsg && priorBody.includes(publicUrl)) return;

  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    appointmentId: input.appointmentId,
    triggerTypes: ["nps"],
    reason: "nps_reagendado",
  });

  const scheduledAt = new Date(Date.now() + NPS_SEND_DELAY_MINUTES * 60_000);

  const { data: run, error: runErr } = await supabaseAdmin
    .from("wa_follow_up_runs" as never)
    .insert({
      tenant_id: input.tenantId,
      trigger_type: "nps",
      patient_id: input.patientId,
      conversation_id: input.conversationId,
      appointment_id: input.appointmentId,
      metadata: { nps_token: input.npsToken },
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
    conversation_id: input.conversationId,
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

  const phone = normalizeBrazilPhone(convRow.contact_phone);
  const result = await providerSendText(phone, text);
  const now = new Date();

  await insertWaMessage({
    tenantId,
    conversationId,
    waMessageId: result.messageId,
    direction: "outbound",
    messageType: "text",
    body: text,
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
      last_message_preview: text.slice(0, 120),
      updated_at: now.toISOString(),
    } as never)
    .eq("id", conversationId);

  logAuditSafe({
    tenantId,
    category: "whatsapp",
    action: "whatsapp.message_auto_sent",
    summary: `Mensagem automática enviada (Z-API): ${text.slice(0, 100)}`,
    entityType: "conversation",
    entityId: conversationId,
    conversationId,
    details: {
      wa_message_id: result.messageId,
      step_key: meta?.stepKey,
      run_id: meta?.runId,
      trigger_type: meta?.triggerType,
      preview: text.slice(0, 200),
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
      const run = row.wa_follow_up_runs;

      if (row.conversation_id) {
        const decision = await shouldSendFollowUpStep({
          tenantId: row.tenant_id,
          conversationId: row.conversation_id,
          triggerType: run.trigger_type,
          runStartedAt: run.started_at,
          appointmentId: row.appointment_id,
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
        if (assignee) {
          await createManualTask({
            tenantId: row.tenant_id,
            conversationId: row.conversation_id,
            patientId: row.patient_id,
            assignedTo: assignee,
            title: `Follow-up: ${row.step_key.replace(/_/g, " ")}`,
            description: row.rendered_message ?? row.message_template,
            dueAt: now,
          });
        }
        manual++;
        continue;
      }

      if (!row.conversation_id || !row.rendered_message) {
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

      const result = await sendAutomatedMessage(
        row.tenant_id,
        row.conversation_id,
        row.rendered_message,
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
            message_preview: (row.rendered_message ?? "").slice(0, 200),
          } as never);
        }
      }

      await logCrmEvent({
        tenantId: row.tenant_id,
        eventType: "follow_up_sent",
        conversationId: row.conversation_id,
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
        conversationId: row.conversation_id,
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

  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    reason: "patient_replied",
  });

  if (!input.isFirstInbound) return;

  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return;

  const leadDecision = shouldStartLeadNoResponse(analysis);
  if (!leadDecision.ok) return;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ lead_first_inbound_at: now } as never)
    .eq("id", input.conversationId);

  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "lead_received",
    conversationId: input.conversationId,
  });

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("patient_id, contact_name")
    .eq("id", input.conversationId)
    .maybeSingle();

  await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "lead_no_response",
    sequenceKey: "lead_no_response",
    conversationId: input.conversationId,
    patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
    templateContext: {
      patientName: input.patientName ?? (conv as { contact_name?: string | null } | null)?.contact_name,
    },
  });
}

export async function onOutboundMessageForFollowUp(input: {
  tenantId: string;
  conversationId: string;
  text: string;
  userId?: string | null;
}) {
  await cancelActiveFollowUpRuns({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    triggerTypes: ["lead_no_response"],
    reason: "staff_replied",
  });

  if (!detectPriceInMessage(input.text)) return;

  const analysis = await analyzeConversation(input.conversationId);
  if (!analysis) return;

  const priceDecision = shouldStartLeadPriceSent(analysis, input.text);
  if (!priceDecision.ok) return;

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ price_sent_at: now } as never)
    .eq("id", input.conversationId);

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("patient_id, contact_name, price_sent_at")
    .eq("id", input.conversationId)
    .maybeSingle();

  await logCrmEvent({
    tenantId: input.tenantId,
    eventType: "price_sent",
    conversationId: input.conversationId,
    patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
    userId: input.userId ?? null,
  });

  await scheduleFollowUpRun({
    tenantId: input.tenantId,
    triggerType: "lead_price_sent",
    sequenceKey: "lead_price_sent",
    conversationId: input.conversationId,
    patientId: (conv as { patient_id?: string | null } | null)?.patient_id ?? null,
    createdBy: input.userId ?? null,
    baseTime: new Date(now),
    templateContext: {
      patientName: (conv as { contact_name?: string | null } | null)?.contact_name,
    },
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
    supabaseAdmin.from("profiles").select("full_name").eq("id", input.professionalId).maybeSingle(),
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
    triggerTypes: ["lead_no_response", "lead_price_sent"],
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
      professionalName: professional?.full_name,
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
      .select("full_name")
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
          professionalName: professional?.full_name,
        },
      });
    }

    let npsToken = (existingNps as { token?: string } | null)?.token;
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

    if (npsToken && conv?.id) {
      await scheduleNpsWhatsApp({
        tenantId: input.tenantId,
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        conversationId: conv.id,
        npsToken,
        patientName: patient?.full_name ?? conv?.contact_name,
      }).catch((e) => console.error("[CRM] NPS schedule error:", e));
    }

    if (!existingNps) {
      await scheduleFollowUpRun({
        tenantId: input.tenantId,
        triggerType: "reactivation",
        sequenceKey: "reactivation",
        conversationId: conv?.id ?? null,
        patientId: input.patientId,
        baseTime: new Date(),
        templateContext: {
          patientName: patient?.full_name ?? conv?.contact_name,
          professionalName: professional?.full_name,
        },
      });
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
    .select("full_name")
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
        professionalName: professional?.full_name,
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
  return steps?.[0]?.template ?? "";
}
