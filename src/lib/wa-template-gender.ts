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

const GENDER_LITERAL_FIXES: { placeholder: string; patterns: RegExp[] }[] = [
  {
    placeholder: "{{muitos_pacientes}}",
    patterns: [/\bmuitas pacientes\b/gi, /\bmuitos pacientes\b/gi],
  },
  {
    placeholder: "ficar {{perdido}}",
    patterns: [/\bficar perdida\b/gi, /\bficar perdido\b/gi],
  },
  {
    placeholder: "continua {{insatisfeito}}",
    patterns: [/\bcontinua insatisfeita\b/gi, /\bcontinua insatisfeito\b/gi],
  },
  {
    placeholder: "ficar {{interessado}}",
    patterns: [/\bficar interessada\b/gi, /\bficar interessado\b/gi],
  },
  {
    placeholder: "ficar {{satisfeito}}",
    patterns: [/\bficar satisfeita\b/gi, /\bficar satisfeito\b/gi],
  },
];

/**
 * Converte concordâncias fixas (comum em templates editados manualmente) para placeholders dinâmicos.
 * "mensagem perdida" não é alterado — concorda com "mensagem", não com o paciente.
 */
export function normalizeGenderInTemplate(template: string): string {
  let out = template;
  for (const { placeholder, patterns } of GENDER_LITERAL_FIXES) {
    const varName = placeholder.match(/\{\{(\w+)\}\}/)?.[1];
    if (varName && out.includes(`{{${varName}}}`)) continue;
    for (const pattern of patterns) {
      out = out.replace(pattern, placeholder);
    }
  }
  return out;
}
