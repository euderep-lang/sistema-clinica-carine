import { describe, expect, it } from "vitest";
import {
  buildGenderTemplateVars,
  normalizeGenderInTemplate,
  normalizePatientGender,
} from "@/lib/wa-template-gender";
import { mergeFollowUpSequences } from "@/lib/wa-follow-up-templates";
import { renderFollowUpMessage } from "@/lib/wa-follow-up.server";

describe("wa-template-gender", () => {
  it("normalizes patient gender from cadastro", () => {
    expect(normalizePatientGender("Masculino")).toBe("m");
    expect(normalizePatientGender("Feminino")).toBe("f");
    expect(normalizePatientGender(null)).toBe("n");
  });

  it("builds masculine and feminine concordance", () => {
    expect(buildGenderTemplateVars("Masculino")).toMatchObject({
      perdido: "perdido",
      insatisfeito: "insatisfeito",
      muitos_pacientes: "muitos pacientes",
    });
    expect(buildGenderTemplateVars("Feminino")).toMatchObject({
      perdido: "perdida",
      insatisfeito: "insatisfeita",
      muitos_pacientes: "muitas pacientes",
    });
  });

  it("defaults to masculine when gender is unknown", () => {
    expect(buildGenderTemplateVars(undefined).perdido).toBe("perdido");
  });

  it("fixes hardcoded gender literals in edited templates", () => {
    expect(normalizeGenderInTemplate("muitas pacientes procuram a clínica")).toBe(
      "{{muitos_pacientes}} procuram a clínica",
    );
    expect(normalizeGenderInTemplate("sem você ficar perdida")).toBe("sem você ficar {{perdido}}");
    expect(normalizeGenderInTemplate("continua insatisfeita com")).toBe("continua {{insatisfeito}} com");
    expect(
      normalizeGenderInTemplate("passando só para não deixar sua mensagem perdida"),
    ).toBe("passando só para não deixar sua mensagem perdida");
  });

  it("renders Euder (masculino) with correct concordance in tenant-style overrides", () => {
    const merged = mergeFollowUpSequences({
      lead_no_response: {
        lead_no_response_3d:
          "{{primeiro_nome}}, muitas pacientes procuram a clínica quando já tentaram dieta.",
      },
      lead_price_sent: {
        lead_price_sent_48h:
          "Oii, {{primeiro_nome}}. Às vezes consigo te orientar sem você ficar perdida.",
      },
    });

    const euder = {
      patientName: "Euder Flavio da Silva Alves Filho",
      patientGender: "Masculino",
    };

    const msg3d = renderFollowUpMessage(
      merged.lead_no_response.find((s) => s.key === "lead_no_response_3d")!.template,
      euder,
    );
    const msg48h = renderFollowUpMessage(
      merged.lead_price_sent.find((s) => s.key === "lead_price_sent_48h")!.template,
      euder,
    );

    expect(msg3d).toContain("Euder");
    expect(msg3d).toContain("muitos pacientes");
    expect(msg3d).not.toContain("muitas pacientes");
    expect(msg48h).toContain("perdido");
    expect(msg48h).not.toContain("perdida");
  });

  it("renders Maria (feminino) with feminine concordance", () => {
    const template =
      "Oii, {{primeiro_nome}}. Sem você ficar {{perdido}}. {{muitos_pacientes}}.";
    const maria = { patientName: "Maria Silva", patientGender: "Feminino" };
    const rendered = renderFollowUpMessage(template, maria);
    expect(rendered).toContain("perdida");
    expect(rendered).toContain("muitas pacientes");
  });
});
