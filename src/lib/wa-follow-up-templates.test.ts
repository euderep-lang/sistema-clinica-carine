import { describe, expect, it } from "vitest";
import {
  FOLLOW_UP_SEQUENCE_DEFAULTS,
  FOLLOW_UP_VARIANT_COUNT,
  mergeFollowUpSequences,
  padTemplatesToFive,
  primaryTemplate,
  templatesToOverrides,
} from "@/lib/wa-follow-up-templates";

describe("wa-follow-up-templates", () => {
  it("includes D-1 appointment reminder in appointment_booked sequence", () => {
    const steps = FOLLOW_UP_SEQUENCE_DEFAULTS.appointment_booked;
    const keys = steps.map((s) => s.key);
    expect(keys).toContain("appointment_reminder_24h");
    expect(keys).toContain("appointment_booked_now");
  });

  it("every default step has exactly 5 templates", () => {
    for (const steps of Object.values(FOLLOW_UP_SEQUENCE_DEFAULTS)) {
      for (const step of steps) {
        expect(step.templates).toHaveLength(FOLLOW_UP_VARIANT_COUNT);
        expect(step.templates.every((t) => t.trim().length > 0)).toBe(true);
      }
    }
  });

  it("merges string override as variation 1 (legacy compat)", () => {
    const merged = mergeFollowUpSequences({
      appointment_booked: {
        appointment_reminder_24h: "Lembrete customizado",
      },
    });
    const step = merged.appointment_booked.find((s) => s.key === "appointment_reminder_24h");
    expect(primaryTemplate(step!)).toBe("Lembrete customizado");
    expect(step?.templates).toHaveLength(5);
  });

  it("merges array overrides for all variants", () => {
    const variants = padTemplatesToFive([
      "v1",
      "v2",
      "v3",
      "v4",
      "v5",
    ]);
    const merged = mergeFollowUpSequences({
      appointment_booked: {
        appointment_booked_now: variants,
      },
    });
    const step = merged.appointment_booked.find((s) => s.key === "appointment_booked_now");
    expect(step?.templates).toEqual(variants);
  });

  it("templatesToOverrides only stores changed steps", () => {
    const defaults = FOLLOW_UP_SEQUENCE_DEFAULTS.appointment_booked[0]!;
    const edited = {
      appointment_booked: {
        [defaults.key]: [...defaults.templates],
      },
    };
    expect(templatesToOverrides(edited)).toEqual({});

    const changed = [...defaults.templates];
    changed[2] = "texto diferente na variação 3";
    const out = templatesToOverrides({
      appointment_booked: { [defaults.key]: changed },
    });
    expect(out.appointment_booked?.[defaults.key]).toEqual(changed);
  });
});
