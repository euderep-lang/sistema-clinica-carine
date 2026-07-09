import { normalizeGenderInTemplate } from "@/lib/wa-template-gender";

export type FollowUpMode = "auto" | "manual";

export type FollowUpStepDef = {
  key: string;
  delayMinutes: number;
  mode: FollowUpMode;
  template: string;
};

export const WA_FOLLOW_UP_TEMPLATES_KEY = "wa_follow_up_templates";
export const WA_AFTER_HOURS_MESSAGE_KEY = "wa_after_hours_message";

export const FOLLOW_UP_SEQUENCE_META: Record<string, { label: string; description: string }> = {
  lead_no_response: {
    label: "Lead sem resposta",
    description: "Primeiro contato do paciente sem resposta da equipe.",
  },
  lead_price_sent: {
    label: "Após envio de preço",
    description: "Quando a equipe envia valor/orçamento e o paciente não responde.",
  },
  appointment_booked: {
    label: "Consulta agendada",
    description:
      "Confirmação na hora do agendamento. Lembrete D-1 só se a consulta for depois de amanhã; consulta amanhã recebe só o lembrete de 3h antes.",
  },
  post_consultation: {
    label: "Pós-consulta",
    description: "Acompanhamento após a consulta realizada.",
  },
  no_show: {
    label: "Falta na consulta",
    description: "Paciente não compareceu ao agendamento.",
  },
  reactivation: {
    label: "Reativação",
    description: "Retomada de contato com pacientes antigos.",
  },
  objection_vou_pensar: {
    label: "Objeção — Vou pensar",
    description: "Sugestão ao marcar objeção na conversa.",
  },
  objection_achei_caro: {
    label: "Objeção — Achei caro",
    description: "Sugestão ao marcar objeção na conversa.",
  },
  objection_preciso_agenda: {
    label: "Objeção — Preciso ver agenda",
    description: "Sugestão ao marcar objeção na conversa.",
  },
  objection_medo_hormonio: {
    label: "Objeção — Medo de hormônio",
    description: "Sugestão ao marcar objeção na conversa.",
  },
};

export const FOLLOW_UP_SEQUENCE_DEFAULTS: Record<string, FollowUpStepDef[]> = {
  lead_no_response: [
    {
      key: "lead_no_response_15m",
      delayMinutes: 15,
      mode: "auto",
      template:
        "Oi, {{primeiro_nome}}, tudo bem? Vi que você entrou em contato com a clínica. Para eu te direcionar melhor: você busca atendimento por emagrecimento, hormônios, menopausa, lipedema ou outro motivo?",
    },
    {
      key: "lead_no_response_4h",
      delayMinutes: 240,
      mode: "auto",
      template:
        "{{primeiro_nome}}, passando só para não deixar sua mensagem perdida. Me diga qual é sua principal queixa hoje que eu te explico como funciona o atendimento.",
    },
    {
      key: "lead_no_response_24h",
      delayMinutes: 1440,
      mode: "auto",
      template:
        "Vou encerrar seu atendimento por aqui para não te incomodar, {{primeiro_nome}}. Mas, se ainda quiser entender como funciona a consulta médica, é só me falar aqui.",
    },
    {
      key: "lead_no_response_3d",
      delayMinutes: 4320,
      mode: "auto",
      template:
        "{{primeiro_nome}}, {{muitos_pacientes}} procuram a clínica quando já tentaram dieta, treino ou tratamentos isolados e ainda sentem que o corpo não responde. Se esse for seu caso, posso te explicar o caminho da avaliação médica.",
    },
    {
      key: "lead_no_response_7d",
      delayMinutes: 10080,
      mode: "auto",
      template:
        "Último contato por aqui, {{primeiro_nome}}. Caso ainda queira agendar sua avaliação, me avise — será um prazer ter você aqui com a gente.",
    },
  ],
  lead_price_sent: [
    {
      key: "lead_price_sent_30m",
      delayMinutes: 30,
      mode: "auto",
      template:
        "{{primeiro_nome}}, ficou alguma dúvida sobre o valor ou sobre como funciona a consulta? Posso te explicar de forma simples.",
    },
    {
      key: "lead_price_sent_24h",
      delayMinutes: 1440,
      mode: "auto",
      template:
        "Só reforçando, {{primeiro_nome}}: a consulta não é apenas uma conversa rápida. A ideia é investigar exames, sintomas, rotina, composição corporal e montar uma conduta individualizada para o seu caso, está bem?",
    },
    {
      key: "lead_price_sent_48h",
      delayMinutes: 2880,
      mode: "auto",
      template:
        "Oii, {{primeiro_nome}}. Se o que te travou foi o valor, me fala com sinceridade. Às vezes consigo te orientar sobre a melhor forma de iniciar sem você ficar {{perdido}}.",
    },
    {
      key: "lead_price_sent_5d",
      delayMinutes: 7200,
      mode: "auto",
      template:
        "Continuar tentando sozinha pode sair mais caro do que investigar corretamente. Quando quiser dar esse passo com estratégia, me chama por aqui. Muito obrigada, {{primeiro_nome}}.",
    },
  ],
  appointment_booked: [
    {
      key: "appointment_booked_now",
      delayMinutes: 0,
      mode: "auto",
      template:
        "Oi, {{primeiro_nome}}, sua consulta ficou agendada para {{data_consulta}} às {{hora_consulta}}. Para aproveitar melhor, traga seus exames recentes, lista de medicamentos/suplementos e anote suas principais queixas.",
    },
    {
      key: "appointment_reminder_24h",
      delayMinutes: -1440,
      mode: "auto",
      template:
        "Confirmando sua consulta amanhã às {{hora_consulta}}, {{primeiro_nome}}. Responda \"eu vou\" para manter seu horário reservado.",
    },
    {
      key: "appointment_reminder_3h",
      delayMinutes: -180,
      mode: "auto",
      template:
        "{{primeiro_nome}}, sua consulta é hoje às {{hora_consulta}}. Chegue com alguns minutos de antecedência e traga seus exames, se tiver. Te vejo lá!",
    },
  ],
  post_consultation: [
    {
      key: "post_consultation_24h",
      delayMinutes: 1440,
      mode: "auto",
      template:
        "Oi, {{primeiro_nome}}. Passando para saber como você ficou após a consulta de ontem com a {{nome_profissional}}. Conseguiu entender bem a conduta e os próximos passos? Se surgiu alguma dúvida inicial, pode me enviar por aqui.",
    },
    {
      key: "post_consultation_7d",
      delayMinutes: 10080,
      mode: "auto",
      template:
        "Oi, {{primeiro_nome}}. Já se passaram alguns dias desde a consulta. Como você está se sentindo? Alguma dificuldade com alimentação, medicação, suplementação ou rotina?",
    },
    {
      key: "post_consultation_15d",
      delayMinutes: 21600,
      mode: "auto",
      template:
        "{{primeiro_nome}}, passando para acompanhar sua evolução. O mais importante nessa fase não é perfeição, é aderência. Me diga: de 0 a 10, quanto você está se sentindo? Me conte tudo.",
    },
    {
      key: "post_consultation_30d",
      delayMinutes: 43200,
      mode: "auto",
      template:
        "Já temos um mês desde a consulta, {{primeiro_nome}}. Esse é um bom momento para ajustar o que não encaixou bem na rotina. Como estão energia, fome, sono, disposição e medidas?",
    },
  ],
  no_show: [
    {
      key: "no_show_2h",
      delayMinutes: 120,
      mode: "auto",
      template:
        "Oi, {{primeiro_nome}}. Vi que você não conseguiu comparecer à consulta de hoje. Aconteceu algum imprevisto?",
    },
    {
      key: "no_show_next_day",
      delayMinutes: 1440,
      mode: "manual",
      template:
        "{{primeiro_nome}}, posso verificar uma nova possibilidade de horário para você. Quer que eu veja a próxima agenda disponível?",
    },
  ],
  reactivation: [
    {
      key: "reactivation_30d",
      delayMinutes: 43200,
      mode: "auto",
      template:
        "Oi, {{primeiro_nome}}! Faz um tempo que não nos falamos. Como você está? Se quiser retomar seu acompanhamento, estou à disposição.",
    },
    {
      key: "reactivation_60d",
      delayMinutes: 86400,
      mode: "auto",
      template:
        "{{primeiro_nome}}, passando para saber se ainda faz sentido cuidarmos da sua saúde com estratégia. Posso te ajudar a retomar?",
    },
    {
      key: "reactivation_90d",
      delayMinutes: 129600,
      mode: "auto",
      template:
        "Último contato por aqui, {{primeiro_nome}}. Quando quiser voltar a cuidar de você com acompanhamento médico, é só me chamar.",
    },
  ],
  objection_vou_pensar: [
    {
      key: "objection_vou_pensar",
      delayMinutes: 0,
      mode: "manual",
      template:
        "Claro. Só não deixa isso virar mais uma coisa que você adia enquanto continua {{insatisfeito}} com os mesmos sintomas. Quer que eu te ajude a entender se esse atendimento faz sentido para seu caso?",
    },
  ],
  objection_achei_caro: [
    {
      key: "objection_achei_caro",
      delayMinutes: 0,
      mode: "manual",
      template:
        "Entendo. Só vale comparar com o que está incluso: avaliação médica, investigação por exames, conduta individualizada e acompanhamento. Não é uma consulta genérica.",
    },
  ],
  objection_preciso_agenda: [
    {
      key: "objection_preciso_agenda",
      delayMinutes: 0,
      mode: "manual",
      template:
        "Perfeito. Posso te enviar duas opções de horário e você escolhe a melhor?",
    },
  ],
  objection_medo_hormonio: [
    {
      key: "objection_medo_hormonio",
      delayMinutes: 0,
      mode: "manual",
      template:
        "A consulta não significa sair usando hormônio ou medicação. Primeiro vem avaliação, exames e indicação correta. Conduta sem necessidade não faz sentido.",
    },
  ],
};

/** Ordem de exibição nas configurações. */
export const FOLLOW_UP_SEQUENCE_ORDER = [
  "lead_no_response",
  "lead_price_sent",
  "appointment_booked",
  "post_consultation",
  "no_show",
  "reactivation",
  "objection_vou_pensar",
  "objection_achei_caro",
  "objection_preciso_agenda",
  "objection_medo_hormonio",
] as const;

export type FollowUpTemplateOverrides = Record<string, Record<string, string>>;

export function mergeFollowUpSequences(
  overrides: FollowUpTemplateOverrides | null | undefined,
): Record<string, FollowUpStepDef[]> {
  const result: Record<string, FollowUpStepDef[]> = {};
  for (const [sequenceKey, steps] of Object.entries(FOLLOW_UP_SEQUENCE_DEFAULTS)) {
    const seqOverrides = overrides?.[sequenceKey];
    result[sequenceKey] = steps.map((step) => ({
      ...step,
      template: normalizeGenderInTemplate(seqOverrides?.[step.key]?.trim() || step.template),
    }));
  }
  return result;
}

export function templatesToOverrides(
  edited: FollowUpTemplateOverrides,
): FollowUpTemplateOverrides {
  const out: FollowUpTemplateOverrides = {};
  for (const [sequenceKey, steps] of Object.entries(FOLLOW_UP_SEQUENCE_DEFAULTS)) {
    const seqEdited = edited[sequenceKey];
    if (!seqEdited) continue;
    for (const step of steps) {
      const value = normalizeGenderInTemplate(seqEdited[step.key]?.trim() ?? "");
      if (!value || value === step.template.trim()) continue;
      if (!out[sequenceKey]) out[sequenceKey] = {};
      out[sequenceKey][step.key] = value;
    }
  }
  return out;
}

export function mergedTemplatesForEditing(
  overrides: FollowUpTemplateOverrides | null | undefined,
): FollowUpTemplateOverrides {
  const merged = mergeFollowUpSequences(overrides);
  const out: FollowUpTemplateOverrides = {};
  for (const [sequenceKey, steps] of Object.entries(merged)) {
    out[sequenceKey] = {};
    for (const step of steps) {
      out[sequenceKey][step.key] = step.template;
    }
  }
  return out;
}

export function formatFollowUpStepDelay(minutes: number): string {
  if (minutes === 0) return "Imediato";
  if (minutes < 0) {
    const hours = Math.abs(minutes) / 60;
    if (hours >= 24) return `${Math.round(hours / 24)} dia(s) antes da consulta`;
    return `${hours}h antes da consulta`;
  }
  if (minutes < 60) return `${minutes} min depois`;
  if (minutes < 1440) return `${minutes / 60}h depois`;
  return `${Math.round(minutes / 1440)} dia(s) depois`;
}

export function followUpModeLabel(mode: FollowUpMode): string {
  return mode === "auto" ? "Automática" : "Tarefa manual";
}
