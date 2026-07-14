import { describe, expect, it } from "vitest";
import {
  extractBrazilMobileFromLong,
  isBrazilMobileE164,
  isWhatsAppLid,
  normalizeBrazilPhone,
  normalizeWaPhone,
  phonesMatch,
  resolvePatientPhoneE164,
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

describe("resolvePatientPhoneE164 / normalizeWaPhone", () => {
  it("monta E.164 EUA", () => {
    expect(resolvePatientPhoneE164("(774) 204-1500", "1")).toBe("17742041500");
    expect(normalizeWaPhone("(774) 204-1500", "1")).toBe("17742041500");
  });

  it("mantém Brasil no normalizador clássico", () => {
    expect(resolvePatientPhoneE164("(16) 98466-0225", "55")).toBe("5516984660225");
  });

  it("aceita número internacional já com DDI", () => {
    expect(normalizeWaPhone("17742041500")).toBe("17742041500");
    expect(phonesMatch("17742041500", "7742041500")).toBe(true);
  });

  it("Portugal", () => {
    expect(resolvePatientPhoneE164("912 345 678", "351")).toBe("351912345678");
  });
});
