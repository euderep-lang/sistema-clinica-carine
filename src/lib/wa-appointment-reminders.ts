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

/** Consultas a partir deste horário recebem lembrete no dia (8h + 3h antes). 7h–10h: não envia. */
export const SAME_DAY_REMINDER_3H_FROM_MIN = 10 * 60;

/** Primeiro lembrete no dia para consultas após as 10h. */
export const SAME_DAY_MORNING_REMINDER_HHMM = "08:00";
const SAME_DAY_MORNING_MIN = 8 * 60;

/** Sentinel de delay do passo das 8h (o horário real é wall-clock, não offset). */
export const SAME_DAY_MORNING_REMINDER_DELAY_MINUTES = -1;

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

/** Consulta às 10h ou depois — elegível a lembrete no dia. 7h–9h59: não envia. */
export function isSameDayReminderAppointment(appointmentAt: Date): boolean {
  return wallClockMinutes(appointmentAt) >= SAME_DAY_REMINDER_3H_FROM_MIN;
}

/** Lembrete das 8h no dia: só se a consulta for a partir das 10h. */
export function shouldScheduleSameDayMorningReminder(appointmentAt: Date): boolean {
  return isSameDayReminderAppointment(appointmentAt);
}

/**
 * Lembrete 3h antes: só após as 10h, e só se o envio cair depois das 8h
 * (senão já cobre o lembrete da manhã).
 */
export function shouldScheduleSameDay3hReminder(appointmentAt: Date): boolean {
  if (!isSameDayReminderAppointment(appointmentAt)) return false;
  const threeHoursBefore = new Date(appointmentAt.getTime() - 180 * 60_000);
  return wallClockMinutes(threeHoursBefore) > SAME_DAY_MORNING_MIN;
}

/** Minutos antes da consulta para o passo "appointment_reminder_3h". */
export function sameDayReminderOffsetMinutes(appointmentAt: Date): number | null {
  if (!shouldScheduleSameDay3hReminder(appointmentAt)) return null;
  return 180;
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

  if (stepKey === "appointment_reminder_morning") {
    if (!shouldScheduleSameDayMorningReminder(appointmentAt)) return null;
    const day = dateISOInTimezone(appointmentAt);
    const raw = zonedDateFromWallClock(day, SAME_DAY_MORNING_REMINDER_HHMM);
    if (raw.getTime() <= now.getTime()) return null;
    if (raw.getTime() >= appointmentAt.getTime()) return null;
    return raw;
  }

  if (stepKey === "appointment_reminder_3h") {
    const offset = sameDayReminderOffsetMinutes(appointmentAt);
    if (offset == null) return null;
    const raw = new Date(appointmentAt.getTime() - offset * 60_000);
    if (raw.getTime() <= now.getTime()) return null;
    const scheduledAt = ensureScheduledInMessagingWindow(raw, now);
    if (scheduledAt.getTime() >= appointmentAt.getTime()) return null;
    if (wallClockMinutes(scheduledAt) <= SAME_DAY_MORNING_MIN) return null;
    return scheduledAt;
  }

  const scheduledAt = ensureScheduledInMessagingWindow(
    new Date(appointmentAt.getTime() + delayMinutes * 60_000),
    now,
  );
  if (scheduledAt.getTime() <= now.getTime()) return null;
  return scheduledAt;
}
