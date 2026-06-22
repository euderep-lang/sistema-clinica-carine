export type PatientGenderKind = "f" | "m" | "n";

/** Normaliza sexo do cadastro (Masculino / Feminino / Outro). */
export function normalizePatientGender(gender: string | null | undefined): PatientGenderKind {
  const value = gender?.trim().toLowerCase();
  if (value === "feminino" || value === "f") return "f";
  if (value === "masculino" || value === "m") return "m";
  return "n";
}

/**
 * Variáveis de concordância para templates WhatsApp.
 * Sem sexo no cadastro, usa forma masculina (padrão genérico em português).
 */
export function buildGenderTemplateVars(gender: string | null | undefined): Record<string, string> {
  const kind = normalizePatientGender(gender);
  const feminine = kind === "f";
  return {
    muitos_pacientes: feminine ? "muitas pacientes" : "muitos pacientes",
    perdido: feminine ? "perdida" : "perdido",
    insatisfeito: feminine ? "insatisfeita" : "insatisfeito",
    interessado: feminine ? "interessada" : "interessado",
    satisfeito: feminine ? "satisfeita" : "satisfeito",
  };
}

export const GENDER_TEMPLATE_VAR_KEYS = [
  "muitos_pacientes",
  "perdido",
  "insatisfeito",
  "interessado",
  "satisfeito",
] as const;
