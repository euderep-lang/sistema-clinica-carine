import { renderTemplate } from "@/lib/settings-helpers";

export const WA_NPS_SETTINGS_KEY = "wa_nps_settings";

/** NPS interno do ClinicOS ou link externo (ex.: Google Avaliações). */
export type WaNpsMode = "system" | "external";

export type WaNpsSettings = {
  mode: WaNpsMode;
  /** Texto WhatsApp. Variáveis: {{saudacao}}, {{primeiro_nome}}, {{link_nps}}, {{link_avaliacao}}, {{nome_clinica}} */
  message: string;
  /** URL externa (Google etc.) quando mode = external */
  externalUrl: string;
  /** Minutos após concluir a consulta antes de enviar (padrão 5). */
  delayMinutes: number;
};

export const DEFAULT_NPS_SYSTEM_MESSAGE =
  "{{saudacao}}! Em uma escala de 0 a 10, o quanto você recomendaria nossa clínica? Responda aqui: {{link_nps}}";

export const DEFAULT_NPS_EXTERNAL_MESSAGE =
  "{{saudacao}}! Se puder, deixe uma avaliação rápida do nosso atendimento neste link: {{link_avaliacao}} Muito obrigada!";

export const DEFAULT_WA_NPS_SETTINGS: WaNpsSettings = {
  mode: "system",
  message: DEFAULT_NPS_SYSTEM_MESSAGE,
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

export function normalizeWaNpsSettings(raw: unknown): WaNpsSettings {
  const base = { ...DEFAULT_WA_NPS_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "external" ? "external" : "system";
  const message =
    typeof o.message === "string" && o.message.trim()
      ? o.message.trim()
      : mode === "external"
        ? DEFAULT_NPS_EXTERNAL_MESSAGE
        : DEFAULT_NPS_SYSTEM_MESSAGE;
  const externalUrl = typeof o.externalUrl === "string" ? o.externalUrl.trim() : "";
  const delayRaw = Number(o.delayMinutes);
  const delayMinutes =
    Number.isFinite(delayRaw) && delayRaw >= 0 && delayRaw <= 24 * 60
      ? Math.round(delayRaw)
      : DEFAULT_WA_NPS_SETTINGS.delayMinutes;
  return { mode, message, externalUrl, delayMinutes };
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
  return renderTemplate(template, vars).replace(/\s{2,}/g, " ").trim();
}
