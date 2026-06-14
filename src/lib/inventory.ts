export const UNITS = ["un", "cx", "rl", "L", "mL", "kg", "g", "tb", "fr", "amp", "cps"] as const;
export type MovementType = "in" | "out" | "adjustment" | "waste";

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
  waste: "Descarte",
};

export const MOVEMENT_CLASS: Record<MovementType, string> = {
  in: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  out: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  adjustment: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  waste: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export const REASONS: Record<MovementType, string[]> = {
  in: ["Compra", "Doação", "Devolução de paciente", "Ajuste de inventário"],
  out: ["Uso em procedimento", "Venda direta", "Descarte por vencimento", "Perda/Quebra", "Ajuste"],
  adjustment: ["Contagem física", "Correção de erro", "Outro"],
  waste: ["Vencimento", "Contaminação", "Quebra", "Outro"],
};

export type StockStatus = "healthy" | "low" | "zero";

export function stockStatus(current: number, min: number): StockStatus {
  if (current <= 0) return "zero";
  if (current <= min) return "low";
  return "healthy";
}

export const STATUS_LABEL: Record<StockStatus, string> = { healthy: "Saudável", low: "Baixo", zero: "Zerado" };
export const STATUS_CLASS: Record<StockStatus, string> = {
  healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  low: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  zero: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function fmtDT(d: string) {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function applyMovement(current: number, type: MovementType, quantity: number): number {
  if (type === "in") return current + quantity;
  if (type === "out" || type === "waste") return current - quantity;
  return quantity; // adjustment = absolute
}