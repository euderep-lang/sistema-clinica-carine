import type { Role } from "@/lib/mock-auth";

/** Admin e recepção — agenda, cadastro de pacientes */
export function isOpsStaff(role: Role) {
  return role === "admin" || role === "receptionist";
}

/** Admin, recepção e financeiro — contas a receber/pagar */
export function isFinancialStaff(role: Role) {
  return isOpsStaff(role) || role === "financial";
}

/** Admin, médica e recepção — CRM WhatsApp */
export function isCrmStaff(role: Role) {
  return role === "admin" || role === "professional" || role === "receptionist";
}

/**
 * Notificação de mensagem recebida.
 * Admin e recepção: toda mensagem nova.
 * Profissional: NÃO recebe alerta de mensagem — só é notificado quando uma
 * conversa é transferida para ele (ver notificação de transferência).
 */
export function shouldReceiveWaInboundNotification(
  role: Role,
  _userId: string,
  _assignedTo: string | null,
): boolean {
  return role === "admin" || role === "receptionist";
}
