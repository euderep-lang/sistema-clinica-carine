import { describe, expect, it } from "vitest";
import {
  birthdayIsoInYear,
  buildProfessionalBirthdayAlertMessage,
  resolveBirthdayInCurrentWeek,
} from "@/lib/birthday-week-alert";
import { normalizeWaBirthdaySettings, DEFAULT_BIRTHDAY_TEMPLATES } from "@/lib/wa-birthday-settings";
import { FOLLOW_UP_VARIANT_COUNT } from "@/lib/wa-follow-up-templates";

describe("birthday-week-alert", () => {
  it("maps leap day in non-leap year to Feb 28", () => {
    expect(birthdayIsoInYear("2000-02-29", 2025)).toBe("2025-02-28");
    expect(birthdayIsoInYear("2000-02-29", 2024)).toBe("2024-02-29");
  });

  it("returns null when birthday is outside current week", () => {
    // Monday 2026-07-13 … Sunday 2026-07-19
    expect(resolveBirthdayInCurrentWeek("1990-07-20", "2026-07-14")).toBeNull();
  });

  it("uses hoje / ontem / amanhã when applicable", () => {
    expect(resolveBirthdayInCurrentWeek("1990-07-14", "2026-07-14")?.whenPhrase).toBe("hoje");
    expect(resolveBirthdayInCurrentWeek("1990-07-13", "2026-07-14")?.whenPhrase).toBe("ontem");
    expect(resolveBirthdayInCurrentWeek("1990-07-15", "2026-07-14")?.whenPhrase).toBe("amanhã");
  });

  it("uses dia N (weekday) for other days in the week", () => {
    const alert = resolveBirthdayInCurrentWeek("1990-07-17", "2026-07-14");
    expect(alert?.whenPhrase).toMatch(/^dia 17 \(/);
  });

  it("builds professional alert message with article", () => {
    const alert = resolveBirthdayInCurrentWeek("1990-07-14", "2026-07-14")!;
    expect(
      buildProfessionalBirthdayAlertMessage({
        professionalName: "Dra. Carine",
        patientName: "Maria Silva",
        gender: "Feminino",
        alert,
      }),
    ).toBe("Dra. Carine, o aniversário da Maria é hoje.");
  });
});

describe("wa-birthday-settings", () => {
  it("normalizes to 5 templates enabled by default", () => {
    const s = normalizeWaBirthdaySettings(null);
    expect(s.enabled).toBe(true);
    expect(s.templates).toHaveLength(FOLLOW_UP_VARIANT_COUNT);
    expect(s.templates[0]).toBe(DEFAULT_BIRTHDAY_TEMPLATES[0]);
  });
});
