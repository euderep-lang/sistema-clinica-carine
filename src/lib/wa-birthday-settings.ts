import { padTemplatesToFive, FOLLOW_UP_VARIANT_COUNT } from "@/lib/wa-follow-up-templates";

export const WA_BIRTHDAY_TEMPLATES_KEY = "wa_birthday_templates";
export const BIRTHDAY_STEP_KEY = "birthday";

export type WaBirthdaySettings = {
  /** Quando false, o cron não envia. Padrão: true. */
  enabled: boolean;
  /** Sempre 5 variações. */
  templates: string[];
};

export const DEFAULT_BIRTHDAY_TEMPLATES: string[] = [
  "{{primeiro_nome}}, feliz aniversário! 🎂\n\nA equipe da {{nome_clinica}} celebra com você este novo ciclo e deseja saúde, bem-estar e um dia muito especial. Conte sempre com a gente!",
  "Parabéns, {{primeiro_nome}}! 🎉\n\nQue este dia seja leve e especial. A {{nome_clinica}} torce por você e está aqui quando precisar.",
  "{{saudacao}}! Hoje é dia de celebrar você. ✨\n\nFeliz aniversário da equipe {{nome_clinica}} — saúde e felicidade neste novo ciclo!",
  "{{primeiro_nome}}, nosso abraço carinhoso neste dia tão especial! 💛\n\nFeliz aniversário! Com carinho, {{nome_clinica}}.",
  "Feliz aniversário, {{primeiro_nome}}! 🎈\n\nQue venham bons momentos, saúde e bem-estar. A {{nome_clinica}} celebra com você!",
];

export const DEFAULT_WA_BIRTHDAY_SETTINGS: WaBirthdaySettings = {
  enabled: true,
  templates: [...DEFAULT_BIRTHDAY_TEMPLATES],
};

export const BIRTHDAY_TEMPLATE_VARS = [
  "saudacao",
  "primeiro_nome",
  "nome_paciente",
  "nome_clinica",
] as const;

export function normalizeWaBirthdaySettings(raw: unknown): WaBirthdaySettings {
  if (!raw) return { ...DEFAULT_WA_BIRTHDAY_SETTINGS, templates: [...DEFAULT_BIRTHDAY_TEMPLATES] };

  if (Array.isArray(raw)) {
    return {
      enabled: true,
      templates: padTemplatesToFive(raw as string[], DEFAULT_BIRTHDAY_TEMPLATES),
    };
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const enabled = o.enabled === false ? false : true;
    const templatesRaw = Array.isArray(o.templates)
      ? (o.templates as string[])
      : Array.isArray(o.messages)
        ? (o.messages as string[])
        : DEFAULT_BIRTHDAY_TEMPLATES;
    return {
      enabled,
      templates: padTemplatesToFive(templatesRaw, DEFAULT_BIRTHDAY_TEMPLATES),
    };
  }

  if (typeof raw === "string" && raw.trim()) {
    return {
      enabled: true,
      templates: padTemplatesToFive([raw], DEFAULT_BIRTHDAY_TEMPLATES),
    };
  }

  return { ...DEFAULT_WA_BIRTHDAY_SETTINGS, templates: [...DEFAULT_BIRTHDAY_TEMPLATES] };
}

export function ensureBirthdayTemplatesLength(templates: string[]): string[] {
  return padTemplatesToFive(templates, DEFAULT_BIRTHDAY_TEMPLATES).slice(0, FOLLOW_UP_VARIANT_COUNT);
}
