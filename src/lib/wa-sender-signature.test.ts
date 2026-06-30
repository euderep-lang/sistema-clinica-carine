import { describe, expect, it } from "vitest";
import { formatStaffWaTextForPatient, waStaffSenderLabel } from "./wa-sender-signature.server";

describe("waStaffSenderLabel", () => {
  it("prefere display_name", () => {
    expect(
      waStaffSenderLabel({ full_name: "Carine Cassol", display_name: "Dra. Carine Cassol" }),
    ).toBe("Dra. Carine Cassol");
  });

  it("usa full_name sem display_name", () => {
    expect(waStaffSenderLabel({ full_name: "Maria Silva" })).toBe("Maria Silva");
  });
});

describe("formatStaffWaTextForPatient", () => {
  it("prefixa com negrito WhatsApp", () => {
    expect(
      formatStaffWaTextForPatient("Olá, tudo bem?", {
        full_name: "Carine Cassol",
        display_name: "Dra. Carine Cassol",
      }),
    ).toBe("*Dra. Carine Cassol:*\n\nOlá, tudo bem?");
  });

  it("não duplica prefixo", () => {
    const body = "*Dra. Carine Cassol:*\n\nOlá";
    expect(
      formatStaffWaTextForPatient(body, {
        full_name: "Carine Cassol",
        display_name: "Dra. Carine Cassol",
      }),
    ).toBe(body);
  });

  it("mantém texto sem perfil (automação)", () => {
    expect(formatStaffWaTextForPatient("Mensagem automática", null)).toBe("Mensagem automática");
  });
});
