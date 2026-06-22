/**
 * Detecta confirmação de consulta via WhatsApp (ex.: "eu vou", "confirmo").
 * Atualiza status do agendamento e registra em appointment_confirmations.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAuditSafe } from "@/lib/audit.server";
import { tomorrowISO, todayISO } from "@/lib/locale";

const CONFIRM_PATTERNS = [
  /\beu vou\b/i,
  /\bvou sim\b/i,
  /\bconfirmo\b/i,
  /\bconfirmad[oa]\b/i,
  /\bpode confirmar\b/i,
  /\bestarei\b/i,
  /\bestou confirmad[oa]\b/i,
  /^sim$/i,
  /^ok$/i,
  /^confirmado$/i,
];

const DECLINE_PATTERNS = [
  /\bn[aã]o vou\b/i,
  /\bcancel/i,
  /\bdesmarc/i,
  /\breagend/i,
  /\bn[aã]o posso\b/i,
];

export function isAppointmentConfirmationMessage(body: string): boolean {
  const text = body.trim();
  if (!text) return false;
  return CONFIRM_PATTERNS.some((p) => p.test(text));
}

export function isAppointmentDeclineMessage(body: string): boolean {
  const text = body.trim();
  if (!text) return false;
  return DECLINE_PATTERNS.some((p) => p.test(text));
}

export async function handleAppointmentConfirmationReply(input: {
  tenantId: string;
  conversationId: string;
  patientId?: string | null;
  messageBody: string;
}): Promise<{ handled: boolean; action?: string }> {
  const body = input.messageBody.trim();
  if (!body) return { handled: false };

  const isConfirm = isAppointmentConfirmationMessage(body);
  const isDecline = isAppointmentDeclineMessage(body);
  if (!isConfirm && !isDecline) return { handled: false };

  let patientId = input.patientId ?? null;
  if (!patientId) {
    const { data: conv } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("patient_id")
      .eq("id", input.conversationId)
      .maybeSingle();
    patientId = (conv as { patient_id?: string | null } | null)?.patient_id ?? null;
  }
  if (!patientId) return { handled: false };

  const tomorrow = tomorrowISO();
  const today = todayISO();

  let q = supabaseAdmin
    .from("appointments")
    .select("id, date, start_time, status, professional_id")
    .eq("tenant_id", input.tenantId)
    .eq("patient_id", patientId)
    .in("status", ["scheduled", "confirmed"])
    .in("date", [today, tomorrow])
    .order("date")
    .order("start_time")
    .limit(1);

  const { data: appt } = await q.maybeSingle();
  if (!appt) return { handled: false };

  const apptRow = appt as {
    id: string;
    date: string;
    start_time: string;
    status: string;
  };

  if (isConfirm) {
    if (apptRow.status !== "confirmed") {
      await supabaseAdmin
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", apptRow.id);
    }

    await supabaseAdmin.from("appointment_confirmations" as never).insert({
      tenant_id: input.tenantId,
      appointment_id: apptRow.id,
      patient_id: patientId,
      channel: "whatsapp",
      confirmation_type: apptRow.date === tomorrow ? "d1_reminder" : "same_day",
      status: "confirmed",
      patient_reply: body.slice(0, 500),
      confirmed_at: new Date().toISOString(),
    } as never);

    logAuditSafe({
      tenantId: input.tenantId,
      category: "appointments",
      action: "appointment.confirmed_via_whatsapp",
      summary: `Consulta confirmada via WhatsApp (${apptRow.date} ${apptRow.start_time.slice(0, 5)})`,
      entityType: "appointment",
      entityId: apptRow.id,
      conversationId: input.conversationId,
      details: { patient_reply: body.slice(0, 200) },
      source: "webhook",
    });

    return { handled: true, action: "confirmed" };
  }

  await supabaseAdmin.from("appointment_confirmations" as never).insert({
    tenant_id: input.tenantId,
    appointment_id: apptRow.id,
    patient_id: patientId,
    channel: "whatsapp",
    confirmation_type: "d1_reminder",
    status: "declined",
    patient_reply: body.slice(0, 500),
  } as never);

  logAuditSafe({
    tenantId: input.tenantId,
    category: "appointments",
    action: "appointment.declined_via_whatsapp",
    summary: `Paciente indicou impossibilidade/cancelamento via WhatsApp`,
    entityType: "appointment",
    entityId: apptRow.id,
    conversationId: input.conversationId,
    source: "webhook",
  });

  return { handled: true, action: "declined" };
}
