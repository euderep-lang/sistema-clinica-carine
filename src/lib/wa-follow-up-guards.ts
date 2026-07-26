/** Compara (date YYYY-MM-DD, time HH:MM) — true se a ocorre depois de b. */
export function appointmentOccursAfter(
  a: { date: string; start_time?: string | null },
  b: { date: string; start_time?: string | null },
): boolean {
  if (a.date > b.date) return true;
  if (a.date < b.date) return false;
  const at = (a.start_time ?? "00:00").slice(0, 5);
  const bt = (b.start_time ?? "00:00").slice(0, 5);
  return at > bt;
}

/** Passos de pós-consulta que exigem ausência de nova consulta no intervalo. */
export const POST_CONSULTATION_NO_INTERVENING_STEPS = new Set([
  "post_consultation_7d",
  "post_consultation_15d",
  "post_consultation_30d",
]);

/** Status que contam como “já teve consulta” depois da original. */
export const POST_CONSULTATION_ATTENDED_STATUSES = ["completed", "in_progress"] as const;

/** Status que contam como “tem consulta agendada nesta semana”. */
export const POST_CONSULTATION_BOOKED_STATUSES = ["scheduled", "confirmed"] as const;
