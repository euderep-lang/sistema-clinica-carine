import {
  FOLLOW_UP_SEQUENCE_META,
  FOLLOW_UP_SEQUENCE_ORDER,
  formatFollowUpStepDelay,
  primaryTemplate,
  type FollowUpStepDef,
} from "@/lib/wa-follow-up-templates";

export const AUTOMATION_SHORTCUT_PREFIX = "auto:";

export const AUTOMATION_QUICK_REPLY_CATEGORIES = [
  "lead_sem_resposta",
  "lead_valor",
  "agendamento",
  "pos_consulta",
  "falta",
  "objecao",
  "reativacao",
] as const;

/** Atalhos legados (seed antigo) — removidos na sincronização com a config. */
export const LEGACY_AUTOMATION_SHORTCUTS = [
  "/lead15",
  "/lead4h",
  "/lead24h",
  "/lead3d",
  "/lead7d",
  "/valor30",
  "/valor24h",
  "/valor48h",
  "/valor5d",
  "/agendou",
  "/conf24h",
  "/conf3h",
  "/pos24h",
  "/pos7d",
  "/pos15d",
  "/pos30d",
  "/falta2h",
  "/faltarem",
  "/objpensa",
  "/objcaro",
  "/objagenda",
  "/objmedo",
  "/reat30",
  "/reat60",
  "/reat90",
] as const;

const SEQUENCE_TO_CATEGORY: Record<string, string> = {
  lead_no_response: "lead_sem_resposta",
  lead_price_sent: "lead_valor",
  appointment_booked: "agendamento",
  post_consultation: "pos_consulta",
  no_show: "falta",
  reactivation: "reativacao",
  objection_vou_pensar: "objecao",
  objection_achei_caro: "objecao",
  objection_preciso_agenda: "objecao",
  objection_medo_hormonio: "objecao",
};

export type AutomationQuickReplyRow = {
  shortcut: string;
  name: string;
  content: string;
  category: string;
  sort_order: number;
};

export function automationShortcut(stepKey: string): string {
  return `${AUTOMATION_SHORTCUT_PREFIX}${stepKey}`;
}

/** Normaliza quebras de linha sem remover linhas vazias no meio do texto. */
export function normalizeMessageLineBreaks(content: string): string {
  const unified = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return unified
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").replace(/ +$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/** Conta quebras de linha (para validar se a IA manteve a estrutura). */
export function countLineBreaks(content: string): number {
  return (content.match(/\n/g) ?? []).length;
}

/** True se o texto reescrito manteve o suficiente das quebras da mensagem original. */
export function preservesLineBreakStructure(original: string, rewritten: string): boolean {
  const orig = countLineBreaks(original);
  if (orig === 0) return true;
  const next = countLineBreaks(rewritten);
  return next >= Math.max(1, Math.ceil(orig * 0.5));
}

export function buildAutomationQuickReplyRows(
  sequences: Record<string, FollowUpStepDef[]>,
): AutomationQuickReplyRow[] {
  const rows: AutomationQuickReplyRow[] = [];
  let sortOrder = 0;

  for (const sequenceKey of FOLLOW_UP_SEQUENCE_ORDER) {
    const steps = sequences[sequenceKey];
    if (!steps?.length) continue;

    const category = SEQUENCE_TO_CATEGORY[sequenceKey] ?? "geral";
    const seqLabel = FOLLOW_UP_SEQUENCE_META[sequenceKey]?.label ?? sequenceKey;

    for (const step of steps) {
      rows.push({
        shortcut: automationShortcut(step.key),
        name: `${seqLabel} · ${formatFollowUpStepDelay(step.delayMinutes)}`,
        content: normalizeMessageLineBreaks(primaryTemplate(step)),
        category,
        sort_order: sortOrder++,
      });
    }
  }

  return rows;
}
