import { shiftDateISO, TIMEZONE } from "@/lib/locale";

function dateISOInTimezone(d: Date, timeZone = TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Lembrete D-1 só quando a consulta não é amanhã.
 * Se agendou hoje para amanhã, o paciente já recebe a confirmação agora —
 * enviar o D-1 no mesmo dia fica repetitivo.
 */
export function shouldScheduleAppointmentReminder24h(
  appointmentAt: Date,
  bookedAt: Date = new Date(),
): boolean {
  const aptDay = dateISOInTimezone(appointmentAt);
  const tomorrowFromBooking = shiftDateISO(dateISOInTimezone(bookedAt), 1);
  return aptDay !== tomorrowFromBooking;
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

  if (stepKey === "appointment_reminder_24h" && !shouldScheduleAppointmentReminder24h(appointmentAt, bookedAt)) {
    return null;
  }

  const scheduledAt = new Date(appointmentAt.getTime() + delayMinutes * 60_000);
  if (scheduledAt.getTime() <= now.getTime()) return null;
  return scheduledAt;
}
