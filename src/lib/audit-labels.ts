export type AuditCategory =
  | "whatsapp"
  | "financial"
  | "auth"
  | "patient"
  | "appointment"
  | "settings"
  | "system";

export const AUDIT_CATEGORY_LABEL: Record<AuditCategory | string, string> = {
  whatsapp: "WhatsApp",
  financial: "Financeiro",
  auth: "Usuários",
  patient: "Pacientes",
  appointment: "Agenda",
  settings: "Configurações",
  system: "Sistema",
};

export const AUDIT_SOURCE_LABEL: Record<string, string> = {
  ui: "Interface",
  cron: "Automação (cron)",
  webhook: "Webhook",
  rpc: "Sistema",
  automation: "Automação",
  system: "Sistema",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "financial.payment_received": "Pagamento recebido",
  "financial.payment_reversed": "Pagamento estornado",
  "financial.discount_applied": "Desconto aplicado",
  "financial.bill_cancelled": "Cobrança cancelada",
  "financial.commission_applied": "Comissão aplicada",
  "financial.commission_period_saved": "Período de comissão salvo",
  "financial.commission_period_closed": "Mês de comissão fechado",
  "financial.commission_period_reopened": "Mês de comissão reaberto",
  "patient.created": "Paciente cadastrado",
  "patient.updated": "Paciente atualizado",
  "appointment.created": "Agendamento criado",
  "appointment.status_changed": "Status do agendamento alterado",
  "appointment.deleted": "Agendamento excluído",
  "whatsapp.message_sent": "Mensagem enviada",
  "whatsapp.message_auto_sent": "Mensagem automática enviada",
  "whatsapp.after_hours_reply": "Resposta fora do horário",
  "whatsapp.conversation_closed": "Conversa encerrada",
  "whatsapp.conversation_reopened": "Conversa reaberta",
  "whatsapp.patient_linked": "Paciente vinculado",
  "whatsapp.conversation_assigned": "Conversa atribuída",
  "whatsapp.manual_message": "Mensagem manual",
  "whatsapp.follow_up_sent": "Follow-up automático enviado",
  "whatsapp.broadcast_sent": "Disparo em massa",
  "auth.user_created": "Usuário criado",
  "auth.user_updated": "Usuário atualizado",
  "auth.user_deleted": "Usuário excluído",
  "auth.password_reset": "Senha redefinida",
  "settings.updated": "Configuração alterada",
};

export function auditCategoryLabel(category: string): string {
  return AUDIT_CATEGORY_LABEL[category] ?? category;
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? action.replace(/\./g, " · ");
}

export function auditSourceLabel(source: string): string {
  return AUDIT_SOURCE_LABEL[source] ?? source;
}
