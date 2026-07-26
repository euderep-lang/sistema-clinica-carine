import { describe, expect, it } from "vitest";
import { isPatientRegistrationIncomplete } from "@/lib/patient-registration-complete";

describe("isPatientRegistrationIncomplete", () => {
  it("flags name+phone only as incomplete", () => {
    expect(
      isPatientRegistrationIncomplete({
        full_name: "Maria Silva",
        phone: "(48) 99999-9999",
      }),
    ).toBe(true);
  });

  it("accepts complete registration", () => {
    expect(
      isPatientRegistrationIncomplete({
        full_name: "Maria Silva",
        cpf: "529.982.247-25",
        gender: "Feminino",
        birth_date: "1990-01-15",
        phone: "(48) 99999-9999",
        address_zip: "88010-000",
        address_street: "Rua A",
        address_number: "100",
        address_neighborhood: "Centro",
        address_city: "Florianópolis",
        address_state: "SC",
      }),
    ).toBe(false);
  });
});
