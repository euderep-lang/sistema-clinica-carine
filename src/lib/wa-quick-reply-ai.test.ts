import { describe, expect, it } from "vitest";
import { firstNameFromLabel, humanizeQuickReplyMessage } from "@/lib/wa-quick-reply-ai.server";

describe("humanizeQuickReplyMessage", () => {
  it("returns original when OPENAI_API_KEY is missing", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await humanizeQuickReplyMessage({
      message: "Olá, João! Sua consulta é amanhã às 14:00.",
      patientFirstName: "João",
    });
    if (prev) process.env.OPENAI_API_KEY = prev;
    expect(result.usedAi).toBe(false);
    expect(result.text).toContain("14:00");
  });
});

describe("firstNameFromLabel", () => {
  it("extracts first token", () => {
    expect(firstNameFromLabel("Euder Flavio Silva")).toBe("Euder");
  });
});

describe("normalizeOutboundPatientName", () => {
  it("replaces full name with first name", async () => {
    const { normalizeOutboundPatientName } = await import("@/lib/wa-quick-reply-ai.server");
    const text = normalizeOutboundPatientName("Olá, Euder Flavio da Silva! Tudo bem?", {
      firstName: "Euder",
      fullName: "Euder Flavio da Silva",
    });
    expect(text).toBe("Olá, Euder! Tudo bem?");
  });
});
