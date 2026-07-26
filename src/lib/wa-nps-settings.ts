import { renderTemplate } from "@/lib/settings-helpers";
import { normalizeMessageLineBreaks } from "@/lib/wa-automation-quick-replies";

export const WA_NPS_SETTINGS_KEY = "wa_nps_settings";

/** NPS interno do ClinicOS ou link externo (ex.: Google Avaliações). */
export type WaNpsMode = "system" | "external";

export type WaNpsSettings = {
  mode: WaNpsMode;
  /** Mensagem 1 — paciente que nunca avaliou. Variáveis: {{saudacao}}, {{primeiro_nome}}, {{link_nps}}, {{link_avaliacao}}, {{nome_clinica}} */
  message: string;
  /** Mensagem 2 — paciente que já respondeu NPS alguma vez. */
  messageReturning: string;
  /** URL externa (Google etc.) quando mode = external */
  externalUrl: string;
  /** Minutos após concluir a consulta antes de enviar (padrão 5). */
  delayMinutes: number;
};

export const DEFAULT_NPS_SYSTEM_MESSAGE =
  "{{saudacao}}! Em uma escala de 0 a 10, o quanto você recomendaria nossa clínica? Responda aqui: {{link_nps}}";

export const DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING =
  "{{saudacao}}! Obrigada por já ter avaliado nossa clínica. Se puder, conte como foi desta vez (0 a 10): {{link_nps}}";

export const DEFAULT_NPS_EXTERNAL_MESSAGE =
  "{{saudacao}}! Se puder, deixe uma avaliação rápida do nosso atendimento neste link: {{link_avaliacao}} Muito obrigada!";

export const DEFAULT_NPS_EXTERNAL_MESSAGE_RETURNING =
  "{{saudacao}}! Obrigada por já ter avaliado nosso atendimento. Se puder, deixe um novo feedback neste link: {{link_avaliacao}}";

export const DEFAULT_WA_NPS_SETTINGS: WaNpsSettings = {
  mode: "system",
  message: DEFAULT_NPS_SYSTEM_MESSAGE,
  messageReturning: DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING,
  externalUrl: "",
  delayMinutes: 5,
};

export const NPS_TEMPLATE_VARS = [
  "saudacao",
  "primeiro_nome",
  "link_nps",
  "link_avaliacao",
  "nome_clinica",
] as const;

function defaultMessageForMode(mode: WaNpsMode, returning: boolean): string {
  if (mode === "external") {
    return returning ? DEFAULT_NPS_EXTERNAL_MESSAGE_RETURNING : DEFAULT_NPS_EXTERNAL_MESSAGE;
  }
  return returning ? DEFAULT_NPS_SYSTEM_MESSAGE_RETURNING : DEFAULT_NPS_SYSTEM_MESSAGE;
}

export function normalizeWaNpsSettings(raw: unknown): WaNpsSettings {
  const base = { ...DEFAULT_WA_NPS_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "external" ? "external" : "system";
  const message =
    typeof o.message === "string" && o.message.trim()
      ? o.message.trim()
      : defaultMessageForMode(mode, false);
  const messageReturning =
    typeof o.messageReturning === "string" && o.messageReturning.trim()
      ? o.messageReturning.trim()
      : defaultMessageForMode(mode, true);
  const externalUrl = typeof o.externalUrl === "string" ? o.externalUrl.trim() : "";
  const delayRaw = Number(o.delayMinutes);
  const delayMinutes =
    Number.isFinite(delayRaw) && delayRaw >= 0 && delayRaw <= 24 * 60
      ? Math.round(delayRaw)
      : DEFAULT_WA_NPS_SETTINGS.delayMinutes;
  return { mode, message, messageReturning, externalUrl, delayMinutes };
}

/** Mensagem 1 (nunca avaliou) ou 2 (já avaliou). */
export function pickNpsMessageTemplate(
  settings: WaNpsSettings,
  hasEvaluatedBefore: boolean,
): string {
  const raw = hasEvaluatedBefore ? settings.messageReturning : settings.message;
  const trimmed = raw.trim();
  if (trimmed) return trimmed;
  return defaultMessageForMode(settings.mode, hasEvaluatedBefore);
}

export function buildNpsTemplateVars(input: {
  patientName?: string | null;
  clinicName?: string | null;
  systemNpsUrl?: string | null;
  externalUrl?: string | null;
}): Record<string, string> {
  const first = input.patientName?.trim().split(/\s+/)[0] ?? "";
  return {
    primeiro_nome: first,
    saudacao: first ? `Olá, ${first}` : "Olá",
    link_nps: (input.systemNpsUrl ?? "").trim(),
    link_avaliacao: (input.externalUrl ?? "").trim(),
    nome_clinica: (input.clinicName ?? "nossa clínica").trim() || "nossa clínica",
  };
}

export function renderNpsMessage(template: string, vars: Record<string, string>): string {
  return normalizeMessageLineBreaks(renderTemplate(template, vars));
}
