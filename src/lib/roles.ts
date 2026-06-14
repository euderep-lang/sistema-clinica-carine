import type { Role } from "@/lib/mock-auth";

/** Admin e recepção — agenda, cadastro de pacientes */
export function isOpsStaff(role: Role) {
  return role === "admin" || role === "receptionist";
}

/** Admin, recepção e financeiro — contas a receber/pagar */
export function isFinancialStaff(role: Role) {
  return isOpsStaff(role) || role === "financial";
}
