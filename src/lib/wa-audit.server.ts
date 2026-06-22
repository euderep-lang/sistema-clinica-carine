import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAuditSafe } from "@/lib/audit.server";

const WA_ACTION_TO_AUDIT: Record<string, { action: string; summary: (details?: Record<string, unknown>) => string }> = {
  conversation_closed: {
    action: "whatsapp.conversation_closed",
    summary: () => "Conversa encerrada no CRM",
  },
  conversation_reopened: {
    action: "whatsapp.conversation_reopened",
    summary: () => "Conversa reaberta no CRM",
  },
  patient_linked: {
    action: "whatsapp.patient_linked",
    summary: () => "Paciente vinculado à conversa",
  },
  conversation_assigned: {
    action: "whatsapp.conversation_assigned",
    summary: () => "Conversa atribuída a profissional",
  },
  queue_assigned_to_reception: {
    action: "whatsapp.conversation_assigned",
    summary: () => "Conversa atribuída à recepção",
  },
  manual_message: {
    action: "whatsapp.manual_message",
    summary: (d) => `Mensagem manual: ${String(d?.preview ?? "…").slice(0, 80)}`,
  },
  after_hours_auto_reply: {
    action: "whatsapp.after_hours_reply",
    summary: (d) => `Resposta automática fora do horário: ${String(d?.preview ?? "…").slice(0, 80)}`,
  },
};

export async function logWaAudit(input: {
  tenantId: string;
  conversationId?: string | null;
  userId?: string | null;
  action: string;
  details?: Record<string, unknown>;
  patientId?: string | null;
  source?: "ui" | "cron" | "webhook" | "automation";
}) {
  await supabaseAdmin.from("wa_audit_log" as never).insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    details: input.details ?? null,
  } as never);

  const mapped = WA_ACTION_TO_AUDIT[input.action];
  const source =
    input.source ??
    (input.action === "after_hours_auto_reply" ? "automation" : "ui");

  logAuditSafe({
    tenantId: input.tenantId,
    actorId: input.userId ?? null,
    category: "whatsapp",
    action: mapped?.action ?? `whatsapp.${input.action}`,
    summary: mapped?.summary(input.details) ?? `Ação WhatsApp: ${input.action}`,
    entityType: "conversation",
    entityId: input.conversationId ?? null,
    patientId: input.patientId ?? null,
    conversationId: input.conversationId ?? null,
    details: input.details ?? null,
    source,
  });
}
