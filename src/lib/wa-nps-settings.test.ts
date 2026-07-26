import { describe, expect, it } from "vitest";
import {
  buildNpsTemplateVars,
  DEFAULT_NPS_EXTERNAL_MESSAGE,
  DEFAULT_NPS_SYSTEM_MESSAGE,
  DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING,
  normalizeWaNpsSettings,
  pickNpsMessageTemplate,
  renderNpsMessage,
} from "@/lib/wa-nps-settings";

describe("wa-nps-settings", () => {
  it("defaults to system NPS with two messages", () => {
    const s = normalizeWaNpsSettings(null);
    expect(s.mode).toBe("system");
    expect(s.message).toContain("{{link_nps}}");
    expect(s.messageReturning).toContain("{{link_nps}}");
    expect(s.messageReturning).not.toBe(s.message);
    expect(s.delayMinutes).toBe(5);
  });

  it("fills messageReturning default when only legacy message exists", () => {
    const s = normalizeWaNpsSettings({
      mode: "system",
      message: "Oi {{primeiro_nome}} {{link_nps}}",
      delayMinutes: 10,
    });
    expect(s.message).toBe("Oi {{primeiro_nome}} {{link_nps}}");
    expect(s.messageReturning).toBe(DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING);
    expect(s.delayMinutes).toBe(10);
  });

  it("picks first vs returning template", () => {
    const s = normalizeWaNpsSettings({
      message: "msg1 {{link_nps}}",
      messageReturning: "msg2 {{link_nps}}",
    });
    expect(pickNpsMessageTemplate(s, false)).toBe("msg1 {{link_nps}}");
    expect(pickNpsMessageTemplate(s, true)).toBe("msg2 {{link_nps}}");
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
