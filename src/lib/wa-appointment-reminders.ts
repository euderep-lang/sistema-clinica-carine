import {
  getZonedTimeParts,
  shiftDateISO,
  TIMEZONE,
  zonedDateFromWallClock,
} from "@/lib/locale";

/** Janela permitida para envio automático de follow-ups (fuso São Paulo). */
export const MESSAGING_WINDOW_START_HHMM = "07:00";
export const MESSAGING_WINDOW_END_HHMM = "20:00";

const WINDOW_START_MIN = 7 * 60;
const WINDOW_END_MIN = 20 * 60;

/** Lembrete no dia da consulta está desativado — só confirmação + D-1. */

function dateISOInTimezone(d: Date, timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function wallClockMinutes(d: Date): number {
  const { hour, minute } = getZonedTimeParts(d);
  return hour * 60 + minute;
}

/**
 * Lembrete D-1 só quando a consulta NÃO é amanhã (relativo ao dia do agendamento).
 * Ex.: marcou segunda → terça: só imediato. Marcou segunda → quarta: D-1 na terça.
 * Domingo → segunda: D-1 no domingo (permitido).
 */
export function shouldScheduleAppointmentReminder24h(
  appointmentAt: Date,
  bookedAt: Date = new Date(),
): boolean {
  const aptDay = dateISOInTimezone(appointmentAt);
  const tomorrowFromBooking = shiftDateISO(dateISOInTimezone(bookedAt), 1);
  return aptDay !== tomorrowFromBooking;
}

/** Lembrete no dia desativado. */
export function sameDayReminderOffsetMinutes(_appointmentAt?: Date): number | null {
  return null;
}

export function isWithinMessagingWindow(at: Date = new Date()): boolean {
  const mins = wallClockMinutes(at);
  return mins >= WINDOW_START_MIN && mins <= WINDOW_END_MIN;
}

/**
 * Ajusta o horário para a janela 07:00–20:00 (America/Sao_Paulo).
 * Antes de 07:00 → 07:00 do mesmo dia; depois de 20:00 → 07:00 do dia seguinte.
 */
export function clampToMessagingWindow(at: Date): Date {
  const mins = wallClockMinutes(at);
  const day = dateISOInTimezone(at);
  if (mins >= WINDOW_START_MIN && mins <= WINDOW_END_MIN) return at;
  if (mins < WINDOW_START_MIN) {
    return zonedDateFromWallClock(day, MESSAGING_WINDOW_START_HHMM);
  }
  return zonedDateFromWallClock(shiftDateISO(day, 1), MESSAGING_WINDOW_START_HHMM);
}

/** Próximo instante >= now dentro da janela de envio. */
export function nextMessagingWindowStart(now: Date = new Date()): Date {
  if (isWithinMessagingWindow(now)) return now;
  const clamped = clampToMessagingWindow(now);
  if (clamped.getTime() > now.getTime()) return clamped;
  return zonedDateFromWallClock(shiftDateISO(dateISOInTimezone(now), 1), MESSAGING_WINDOW_START_HHMM);
}

/**
 * Garante horário futuro dentro da janela. Se o resultado ficar no passado, empurra
 * para o próximo início de janela (ex.: agendamento à noite → 07:00 do dia seguinte).
 */
export function ensureScheduledInMessagingWindow(at: Date, now: Date = new Date()): Date {
  let scheduled = clampToMessagingWindow(at);
  if (scheduled.getTime() <= now.getTime()) {
    scheduled = nextMessagingWindowStart(now);
    if (scheduled.getTime() <= now.getTime()) {
      scheduled = zonedDateFromWallClock(
        shiftDateISO(dateISOInTimezone(now), 1),
        MESSAGING_WINDOW_START_HHMM,
      );
    }
  }
  return scheduled;
}

/** Calcula quando um passo relativo à consulta deve disparar (null = não agenda). */
export function resolveAppointmentRelativeSchedule(
  stepKey: string,
  delayMinutes: number,
  appointmentAt: Date,
  bookedAt: Date = new Date(),
  now: Date = new Date(),
): Date | null {
  if (delayMinutes >= 0) return null;

  if (stepKey === "appointment_reminder_24h") {
    if (!shouldScheduleAppointmentReminder24h(appointmentAt, bookedAt)) return null;
    const raw = new Date(appointmentAt.getTime() + delayMinutes * 60_000);
    const scheduledAt = ensureScheduledInMessagingWindow(raw, now);
    if (scheduledAt.getTime() >= appointmentAt.getTime()) return null;
    return scheduledAt;
  }

  if (stepKey === "appointment_reminder_morning" || stepKey === "appointment_reminder_3h") {
    return null;
  }

  const scheduledAt = ensureScheduledInMessagingWindow(
    new Date(appointmentAt.getTime() + delayMinutes * 60_000),
    now,
  );
  if (scheduledAt.getTime() <= now.getTime()) return null;
  return scheduledAt;
}
