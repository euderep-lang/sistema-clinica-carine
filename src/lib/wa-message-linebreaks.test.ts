import { describe, expect, it } from "vitest";
import {
  normalizeMessageLineBreaks,
  preservesLineBreakStructure,
} from "@/lib/wa-automation-quick-replies";
import { renderNpsMessage, buildNpsTemplateVars } from "@/lib/wa-nps-settings";

describe("normalizeMessageLineBreaks", () => {
  it("preserves paragraph breaks", () => {
    const input = "Oi, Maria! Tudo bem?\n\nPassando para saber como você ficou.\n\nFicou claro?";
    expect(normalizeMessageLineBreaks(input)).toBe(input);
  });

  it("collapses spaces within a line but keeps newlines", () => {
    expect(normalizeMessageLineBreaks("Oi,   Maria!\n\nTudo   bem?")).toBe("Oi, Maria!\n\nTudo bem?");
  });

  it("normalizes CRLF and excess blank lines", () => {
    expect(normalizeMessageLineBreaks("A\r\n\r\n\r\nB")).toBe("A\n\nB");
  });
});

describe("preservesLineBreakStructure", () => {
  it("rejects flattened rewrites", () => {
    const original = "Oi!\n\nSegundo parágrafo.\n\nTerceiro.";
    expect(preservesLineBreakStructure(original, "Oi! Segundo parágrafo. Terceiro.")).toBe(false);
    expect(preservesLineBreakStructure(original, "Oi!\n\nSegundo parágrafo.\n\nTerceiro.")).toBe(true);
  });
});

describe("renderNpsMessage line breaks", () => {
  it("does not collapse newlines into spaces", () => {
    const text = renderNpsMessage(
      "Olá!\n\nResponda aqui:\n{{link_nps}}",
      buildNpsTemplateVars({ systemNpsUrl: "https://app.test/nps/x" }),
    );
    expect(text).toContain("\n\n");
    expect(text).toBe("Olá!\n\nResponda aqui:\nhttps://app.test/nps/x");
  });
});
