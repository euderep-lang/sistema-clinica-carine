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

/** Recepção e admin recebem alerta de toda mensagem nova; profissional só das atribuídas a ele. */
export function shouldReceiveWaInboundNotification(
  role: Role,
  userId: string,
  assignedTo: string | null,
): boolean {
  if (role === "admin" || role === "receptionist") return true;
  if (role === "professional") return assignedTo === userId;
  return false;
}
