import { describe, expect, it } from "vitest";
import {
  extractBrazilMobileFromLong,
  isBrazilMobileE164,
  isWhatsAppLid,
  normalizeBrazilPhone,
  phonesMatch,
} from "@/lib/wa-phone";

describe("normalizeBrazilPhone", () => {
  it("normaliza celular com DDD", () => {
    expect(normalizeBrazilPhone("16984660225")).toBe("5516984660225");
    expect(normalizeBrazilPhone("5516984660225")).toBe("5516984660225");
  });

  it("insere 9º dígito em formato legado", () => {
    expect(normalizeBrazilPhone("551684660225")).toBe("5516984660225");
  });

  it("rejeita @lid e strings longas sem celular embutido", () => {
    expect(normalizeBrazilPhone("81896604192873@lid")).toBe("");
    expect(normalizeBrazilPhone("55165008466022568")).toBe("");
    expect(isWhatsAppLid("81896604192873@lid")).toBe(true);
  });

  it("extrai celular embutido em string longa", () => {
    expect(extractBrazilMobileFromLong("55165008466022568")).toBeNull();
    expect(extractBrazilMobileFromLong("xx5516984660225yy")).toBe("5516984660225");
  });

  it("compara formatos equivalentes", () => {
    expect(phonesMatch("16984660225", "5516984660225")).toBe(true);
    expect(isBrazilMobileE164("5516984660225")).toBe(true);
    expect(isBrazilMobileE164("55165008466022568")).toBe(false);
  });
});
