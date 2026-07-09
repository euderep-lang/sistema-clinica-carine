import { describe, expect, it } from "vitest";
import { zonedDateFromWallClock } from "@/lib/locale";
import {
  resolveAppointmentRelativeSchedule,
  shouldScheduleAppointmentReminder24h,
} from "@/lib/wa-appointment-reminders";

describe("wa-appointment-reminders", () => {
  const bookedMorning = zonedDateFromWallClock("2026-07-10", "10:00");
  const aptTomorrow20 = zonedDateFromWallClock("2026-07-11", "20:00");
  const aptDayAfter20 = zonedDateFromWallClock("2026-07-12", "20:00");

  it("pula D-1 quando consulta é amanhã (já recebeu confirmação hoje)", () => {
    expect(shouldScheduleAppointmentReminder24h(aptTomorrow20, bookedMorning)).toBe(false);
  });

  it("mantém D-1 quando consulta é depois de amanhã", () => {
    expect(shouldScheduleAppointmentReminder24h(aptDayAfter20, bookedMorning)).toBe(true);
  });

  it("amanhã: confirmação + 3h, sem lembrete 24h", () => {
    const now = bookedMorning;
    const d1 = resolveAppointmentRelativeSchedule(
      "appointment_reminder_24h",
      -1440,
      aptTomorrow20,
      bookedMorning,
      now,
    );
    const h3 = resolveAppointmentRelativeSchedule(
      "appointment_reminder_3h",
      -180,
      aptTomorrow20,
      bookedMorning,
      now,
    );
    expect(d1).toBeNull();
    expect(h3?.toISOString()).toBe(zonedDateFromWallClock("2026-07-11", "17:00").toISOString());
  });

  it("depois de amanhã: agenda D-1 na véspera", () => {
    const now = bookedMorning;
    const d1 = resolveAppointmentRelativeSchedule(
      "appointment_reminder_24h",
      -1440,
      aptDayAfter20,
      bookedMorning,
      now,
    );
    expect(d1?.toISOString()).toBe(zonedDateFromWallClock("2026-07-11", "20:00").toISOString());
  });

  it("não agenda lembrete cujo horário já passou", () => {
    const bookedLate = zonedDateFromWallClock("2026-07-10", "21:00");
    const d1 = resolveAppointmentRelativeSchedule(
      "appointment_reminder_24h",
      -1440,
      aptTomorrow20,
      bookedLate,
      bookedLate,
    );
    expect(d1).toBeNull();
  });
});
