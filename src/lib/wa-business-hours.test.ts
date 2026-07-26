import { describe, expect, it } from "vitest";
import { shouldSendAfterHoursReply } from "@/lib/wa-business-hours";

describe("shouldSendAfterHoursReply", () => {
  it("allows first reply when never sent", () => {
    expect(shouldSendAfterHoursReply(null, new Date("2026-07-26T22:00:00.000Z"))).toBe(true);
  });

  it("blocks within 12h cooldown", () => {
    const at = new Date("2026-07-26T22:00:00.000Z");
    expect(shouldSendAfterHoursReply("2026-07-26T20:00:00.000Z", at)).toBe(false);
  });

  it("allows again after 12h", () => {
    const at = new Date("2026-07-27T10:00:00.000Z");
    expect(shouldSendAfterHoursReply("2026-07-26T20:00:00.000Z", at)).toBe(true);
  });
});
