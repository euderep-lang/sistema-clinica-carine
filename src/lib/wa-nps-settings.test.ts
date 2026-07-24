import { describe, expect, it } from "vitest";
import {
  buildNpsTemplateVars,
  DEFAULT_NPS_EXTERNAL_MESSAGE,
  DEFAULT_NPS_SYSTEM_MESSAGE,
  normalizeWaNpsSettings,
  renderNpsMessage,
} from "@/lib/wa-nps-settings";

describe("wa-nps-settings", () => {
  it("defaults to system NPS", () => {
    const s = normalizeWaNpsSettings(null);
    expect(s.mode).toBe("system");
    expect(s.message).toContain("{{link_nps}}");
    expect(s.delayMinutes).toBe(5);
  });

  it("renders system message with greeting and link", () => {
    const text = renderNpsMessage(
      DEFAULT_NPS_SYSTEM_MESSAGE,
      buildNpsTemplateVars({
        patientName: "Ana Claudia",
        systemNpsUrl: "https://app.test/nps/tok",
      }),
    );
    expect(text).toContain("Olá, Ana");
    expect(text).toContain("https://app.test/nps/tok");
  });

  it("renders external google-style message", () => {
    const text = renderNpsMessage(
      DEFAULT_NPS_EXTERNAL_MESSAGE,
      buildNpsTemplateVars({
        patientName: "Maria",
        externalUrl: "https://g.page/r/abc",
      }),
    );
    expect(text).toContain("Olá, Maria");
    expect(text).toContain("https://g.page/r/abc");
  });
});
