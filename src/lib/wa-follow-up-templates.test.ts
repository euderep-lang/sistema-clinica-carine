import { describe, expect, it } from "vitest";
import { mergeFollowUpSequences, FOLLOW_UP_SEQUENCE_DEFAULTS } from "@/lib/wa-follow-up-templates";

describe("wa-follow-up-templates", () => {
  it("includes D-1 appointment reminder in appointment_booked sequence", () => {
    const steps = FOLLOW_UP_SEQUENCE_DEFAULTS.appointment_booked;
    const keys = steps.map((s) => s.key);
    expect(keys).toContain("appointment_reminder_24h");
    expect(keys).toContain("appointment_booked_now");
  });

  it("merges template overrides", () => {
    const merged = mergeFollowUpSequences({
      appointment_booked: {
        appointment_reminder_24h: "Lembrete customizado",
      },
    });
    const step = merged.appointment_booked.find((s) => s.key === "appointment_reminder_24h");
    expect(step?.template).toBe("Lembrete customizado");
  });
});
