import { describe, expect, it } from "vitest";
import { resolvePatientPhoneE164 } from "@/lib/wa-phone";

describe("resolvePatientPhoneE164", () => {
  it("normaliza celular BR com DDI 55", () => {
    expect(resolvePatientPhoneE164("11987654321", "55")).toBe("5511987654321");
  });

  it("aceita telefone já com DDI", () => {
    expect(resolvePatientPhoneE164("5511987654321", "55")).toBe("5511987654321");
  });

  it("retorna vazio para telefone inválido", () => {
    expect(resolvePatientPhoneE164("", "55")).toBe("");
  });

  it("monta número EUA", () => {
    expect(resolvePatientPhoneE164("7742041500", "1")).toBe("17742041500");
  });
});
