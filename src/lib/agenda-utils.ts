import { buildCrmInboxSearch } from "@/lib/crm-navigation";
import {
  fmtDateFromDate,
  parseDateOnly,
  shiftDateISO,
  todayISO,
  getZonedTimeParts,
} from "@/lib/locale";

export { todayISO };

export const AGENDA_DAY_START = 8;
export const AGENDA_DAY_END = 22;
export const AGENDA_SLOT_MINUTES = 30;

export function shiftDate(iso: string, days: number) {
  return shiftDateISO(iso, days);
}

/** Segunda-feira da semana que contém a data (ISO). */
export function startOfWeekMonday(iso: string) {
  const d = parseDateOnly(iso);
  const weekday = d.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return shiftDate(iso, diff);
}

export function weekDaysFromMonday(mondayIso: string) {
  return Array.from({ length: 7 }, (_, i) => shiftDate(mondayIso, i));
}

export function formatWeekRange(mondayIso: string) {
  const sunday = shiftDate(mondayIso, 6);
  const mon = parseDateOnly(mondayIso);
  const sun = parseDateOnly(sunday);
  const sameMonth = mon.getUTCMonth() === sun.getUTCMonth();
  const monPart = fmtDateFromDate(mon, { day: "numeric", month: "short" });
  const sunPart = fmtDateFromDate(sun, {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: mon.getUTCFullYear() !== sun.getUTCFullYear() ? "numeric" : undefined,
  });
  return `${monPart} – ${sunPart}`;
}

export function addOneHour(time: string) {
  const [hh, mm] = time.split(":").map(Number);
  return `${String(Math.min((hh || 0) + 1, 23)).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}`;
}

/** Soma minutos a um horário "HH:MM" (limitado ao mesmo dia). */
export function addMinutes(time: string, minutes: number) {
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  const total = Math.max(0, Math.min((hh || 0) * 60 + (mm || 0) + minutes, 23 * 60 + 59));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Rótulo da régua lateral: "8h" para cheias e "8h30" para meias-horas. */
export function agendaSlotLabel(slot: string) {
  const [h, m] = slot.slice(0, 5).split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** True quando o slot é uma meia-hora (ex.: 08:30). */
export function isHalfHourSlot(slot: string) {
  return slot.slice(3, 5) === "30";
}

export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Ex.: "14:00" + "15:00" → "14h às 15h" */
export function formatTimeInterval(start: string, end: string | null) {
  const fmt = (t: string) => {
    const [h, m] = t.slice(0, 5).split(":");
    const hour = Number(h);
    return m === "00" ? `${hour}h` : `${hour}h${m}`;
  };
  const endTime = (end ?? addOneHour(start)).slice(0, 5);
  return `${fmt(start)} às ${fmt(endTime)}`;
}

export function phoneDigits(phone: string | null | undefined) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("55")) return d;
  return d.length >= 10 ? `55${d}` : "";
}

/** @deprecated Use `buildCrmInboxSearch` — conversas abrem no CRM. */
export function whatsappUrl(phone: string | null | undefined, _message?: string) {
  const search = buildCrmInboxSearch({ phone });
  if (!search.phone) return null;
  return "/crm/inbox";
}

export function telUrl(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  return `tel:+${digits.startsWith("55") ? digits : `55${digits}`}`;
}

export function formatAgendaDate(date: string) {
  return fmtDateFromDate(parseDateOnly(date), {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

export function buildHourSlots(startHour = AGENDA_DAY_START, endHour = AGENDA_DAY_END, stepMin = AGENDA_SLOT_MINUTES) {
  const slots: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += stepMin) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

export function currentTimePercent(startHour = AGENDA_DAY_START, endHour = AGENDA_DAY_END) {
  const { hour, minute } = getZonedTimeParts();
  const mins = hour * 60 + minute;
  const start = startHour * 60;
  const end = endHour * 60;
  if (mins < start || mins > end) return null;
  return ((mins - start) / (end - start)) * 100;
}
