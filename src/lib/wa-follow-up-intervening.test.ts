import { describe, expect, it } from "vitest";
import { appointmentOccursAfter } from "@/lib/wa-follow-up-guards";

describe("appointmentOccursAfter", () => {
  it("detects later date", () => {
    expect(
      appointmentOccursAfter(
        { date: "2026-07-10", start_time: "09:00" },
        { date: "2026-07-01", start_time: "14:00" },
      ),
    ).toBe(true);
  });

  it("detects same day later time", () => {
    expect(
      appointmentOccursAfter(
        { date: "2026-07-01", start_time: "16:00" },
        { date: "2026-07-01", start_time: "14:00" },
      ),
    ).toBe(true);
  });

  it("rejects earlier or equal", () => {
    expect(
      appointmentOccursAfter(
        { date: "2026-07-01", start_time: "14:00" },
        { date: "2026-07-01", start_time: "14:00" },
      ),
    ).toBe(false);
    expect(
      appointmentOccursAfter(
        { date: "2026-06-30", start_time: "18:00" },
        { date: "2026-07-01", start_time: "09:00" },
      ),
    ).toBe(false);
  });
});
