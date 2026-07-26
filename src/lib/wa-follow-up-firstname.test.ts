import { describe, expect, it } from "vitest";
import { firstName, renderFollowUpMessage, tidyMissingFirstName } from "@/lib/wa-follow-up.server";

describe("firstName / tidyMissingFirstName", () => {
  it("returns empty when there is no name", () => {
    expect(firstName(null)).toBe("");
    expect(firstName("  ")).toBe("");
    expect(firstName("Maria Silva")).toBe("Maria");
  });

  it("skips the name without inserting tudo bem", () => {
    expect(tidyMissingFirstName("Oi, , tudo bem? Vi que você entrou.")).toBe(
      "Oi, tudo bem? Vi que você entrou.",
    );
    expect(tidyMissingFirstName(", passando só para não deixar sua mensagem perdida.")).toBe(
      "Passando só para não deixar sua mensagem perdida.",
    );
    expect(tidyMissingFirstName("Olá, ! Recebi seu contato.")).toBe("Olá! Recebi seu contato.");
  });

  it("renders lead template without name", () => {
    const text = renderFollowUpMessage(
      "Oi, {{primeiro_nome}}, tudo bem? Vi que você entrou em contato.",
      { patientName: null },
    );
    expect(text).toBe("Oi, tudo bem? Vi que você entrou em contato.");
    expect(text).not.toContain("Oi, tudo bem,");
  });

  it("uses cadastro name when present", () => {
    const text = renderFollowUpMessage("Oi, {{primeiro_nome}}, tudo bem?", {
      patientName: "Ana Claudia",
    });
    expect(text).toBe("Oi, Ana, tudo bem?");
  });
});
