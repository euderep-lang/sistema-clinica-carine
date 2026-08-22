import { describe, expect, it } from "vitest";
import { zonedDateFromWallClock } from "@/lib/locale";
import {
  clampToMessagingWindow,
  ensureScheduledInMessagingWindow,
  isWithinMessagingWindow,
  resolveAppointmentRelativeSchedule,
  sameDayReminderOffsetMinutes,
  shouldScheduleAppointmentReminder24h,
} from "@/lib/wa-appointment-reminders";

describe("wa-appointment-reminders", () => {
  const bookedMorning = zonedDateFromWallClock("2026-07-10", "10:00"); // sexta
  const aptTomorrow20 = zonedDateFromWallClock("2026-07-11", "20:00");
  const aptDayAfter20 = zonedDateFromWallClock("2026-07-12", "20:00");

  it("pula D-1 quando consulta é amanhã (já recebeu confirmação hoje)", () => {
    expect(shouldScheduleAppointmentReminder24h(aptTomorrow20, bookedMorning)).toBe(false);
  });

  it("mantém D-1 quando consulta é depois de amanhã", () => {
    expect(shouldScheduleAppointmentReminder24h(aptDayAfter20, bookedMorning)).toBe(true);
  });

  it("permite D-1 no domingo para consulta na segunda", () => {
    const bookedSat = zonedDateFromWallClock("2026-07-11", "15:00"); // sábado
    const aptMon = zonedDateFromWallClock("2026-07-13", "10:00"); // segunda
    expect(shouldScheduleAppointmentReminder24h(aptMon, bookedSat)).toBe(true);
    const d1 = resolveAppointmentRelativeSchedule(
      "appointment_reminder_24h",
      -1440,
      aptMon,
      bookedSat,
      bookedSat,
    );
    expect(d1?.toISOString()).toBe(zonedDateFromWallClock("2026-07-12", "10:00").toISOString());
  });

  it("amanhã: sem D-1 e sem lembrete no dia", () => {
    const now = bookedMorning;
    const d1 = resolveAppointmentRelativeSchedule(
      "appointment_reminder_24h",
      -1440,
      aptTomorrow20,
      bookedMorning,
      now,
    );
    expect(d1).toBeNull();
    expect(
      resolveAppointmentRelativeSchedule(
        "appointment_reminder_3h",
        -180,
        aptTomorrow20,
        bookedMorning,
        now,
      ),
    ).toBeNull();
    expect(
      resolveAppointmentRelativeSchedule(
        "appointment_reminder_morning",
        -1,
        aptTomorrow20,
        bookedMorning,
        now,
      ),
    ).toBeNull();
  });

  it("não agenda lembrete no dia (8h ou 3h antes)", () => {
    const apt14 = zonedDateFromWallClock("2026-07-12", "14:00");
    expect(sameDayReminderOffsetMinutes(apt14)).toBeNull();
    expect(
      resolveAppointmentRelativeSchedule(
        "appointment_reminder_morning",
        -1,
        apt14,
        bookedMorning,
        bookedMorning,
      ),
    ).toBeNull();
    expect(
      resolveAppointmentRelativeSchedule(
        "appointment_reminder_3h",
        -180,
        apt14,
        bookedMorning,
        bookedMorning,
      ),
    ).toBeNull();
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

  it("janela 7h–20h: após 20h vai para 7h do dia seguinte", () => {
    const late = zonedDateFromWallClock("2026-07-10", "21:30");
    expect(isWithinMessagingWindow(late)).toBe(false);
    expect(clampToMessagingWindow(late).toISOString()).toBe(
      zonedDateFromWallClock("2026-07-11", "07:00").toISOString(),
    );
  });

  it("janela 7h–20h: antes das 7h sobe para 7h", () => {
    const early = zonedDateFromWallClock("2026-07-10", "05:00");
    expect(clampToMessagingWindow(early).toISOString()).toBe(
      zonedDateFromWallClock("2026-07-10", "07:00").toISOString(),
    );
  });

  it("agendamento à noite: ensure empurra envio imediato para 7h do dia seguinte", () => {
    const night = zonedDateFromWallClock("2026-07-10", "22:00");
    const scheduled = ensureScheduledInMessagingWindow(night, night);
    expect(scheduled.toISOString()).toBe(zonedDateFromWallClock("2026-07-11", "07:00").toISOString());
  });
});
