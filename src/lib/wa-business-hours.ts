import { DEFAULT_HOURS, type BusinessHours } from "@/lib/settings-helpers";
import { getZonedTimeParts, getZonedWeekday } from "@/lib/locale";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export const DEFAULT_AFTER_HOURS_MESSAGE =
  "Olá! Recebemos sua mensagem. Nosso horário de atendimento é de segunda a sexta, das 8h às 18h, e sábado das 8h às 13h. Responderemos assim que possível.";

function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Verifica se o instante está dentro do horário comercial (fuso America/Sao_Paulo). */
export function isWithinBusinessHours(hours: BusinessHours | null | undefined, at: Date = new Date()): boolean {
  const schedule = hours ?? DEFAULT_HOURS;
  const { hour, minute } = getZonedTimeParts(at);
  const dayKey = DAY_KEYS[getZonedWeekday(at)];
  const day = schedule[dayKey];
  if (!day?.active) return false;
  const nowMin = hour * 60 + minute;
  const openMin = parseTime(day.open);
  const closeMin = parseTime(day.close);
  return nowMin >= openMin && nowMin < closeMin;
}

/** Evita spam: no máximo uma auto-resposta fora do horário a cada 12h por conversa. */
export function shouldSendAfterHoursReply(lastReplyAt: string | null | undefined, at: Date = new Date()): boolean {
  if (!lastReplyAt) return true;
  const last = new Date(lastReplyAt).getTime();
  return at.getTime() - last >= 12 * 60 * 60 * 1000;
}
