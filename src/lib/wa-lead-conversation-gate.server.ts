import { buildConversationTranscript } from "@/lib/wa-funnel-ai.server";

/** Subconjunto de ConversationAnalysis — evita import circular com wa-follow-up.server. */
export type LeadGateAnalysis = {
  status: string;
  inboundCount: number;
  outboundStaffCount: number;
  inboundAfterStaffCount: number;
  lastInboundAt: string | null;
  lastOutboundStaffAt: string | null;
  lastMessage: {
    direction: "inbound" | "outbound";
    sent_by: string | null;
    body: string | null;
  } | null;
  recentMessages: Array<{
    direction: "inbound" | "outbound";
    body: string | null;
    sent_by: string | null;
  }>;
};

type Msg = {
  direction: "inbound" | "outbound";
  body: string | null;
  created_at: string;
  sent_by: string | null;
  message_type?: string | null;
};

/** Frases da equipe que indicam “aguarde / já retorno” — paciente só espera, não é lead sumido. */
export const STAFF_WAIT_PROMISE_PATTERNS: RegExp[] = [
  /\baguarde\b/i,
  /\bs[oó]\s+um\s+(momento|instante|minuto|segundinho)\b/i,
  /\bvou\s+(te\s+)?(responder|retornar|chamar|avisar|falar|mandar)\b/i,
  /\bj[aá]\s+(te\s+)?(retorno|volto|chamo|aviso|falo|mando)\b/i,
  /\bte\s+(retorno|volto|chamo|aviso)\b/i,
  /\bem\s+breve\s+(te\s+)?(retorno|chamo|aviso|falo)\b/i,
  /\bdeixe?\s+me\s+(verificar|consultar|checar|ver)\b/i,
  /\bvou\s+(verificar|consultar|olhar|checar|ver\s+com|confirmar)\b/i,
  /\bum\s+minuto\b/i,
  /\bj[aá]\s+te\s+passo\b/i,
];

export function staffPromisedLaterReply(staffMessages: Array<{ body: string | null }>): boolean {
  return staffMessages.some((m) => {
    const body = m.body?.trim() ?? "";
    if (!body) return false;
    return STAFF_WAIT_PROMISE_PATTERNS.some((re) => re.test(body));
  });
}

export type LeadConversationGateResult = {
  eligible: boolean;
  reason: string;
};

/**
 * Heurística rápida: só leads novos, sem vai-e-volta e sem “aguarde / já retorno” da equipe.
 */
export function heuristicLeadNoResponseGate(analysis: LeadGateAnalysis): LeadConversationGateResult {
  if (analysis.status === "closed") {
    return { eligible: false, reason: "conversa_encerrada" };
  }
  if (analysis.inboundCount < 1) {
    return { eligible: false, reason: "paciente_nunca_escreveu" };
  }
  if (analysis.outboundStaffCount < 1) {
    return { eligible: false, reason: "equipe_ainda_nao_respondeu" };
  }
  if (!analysis.lastInboundAt || !analysis.lastOutboundStaffAt) {
    return { eligible: false, reason: "historico_incompleto" };
  }
  if (analysis.inboundAfterStaffCount > 0) {
    return { eligible: false, reason: "conversa_ja_em_andamento" };
  }
  if (new Date(analysis.lastInboundAt) >= new Date(analysis.lastOutboundStaffAt)) {
    return { eligible: false, reason: "paciente_ja_respondeu" };
  }
  if (analysis.lastMessage?.direction !== "outbound" || !analysis.lastMessage.sent_by) {
    return { eligible: false, reason: "ultima_mensagem_nao_e_da_equipe" };
  }

  const staffMsgs = analysis.recentMessages.filter((m) => m.direction === "outbound" && m.sent_by);
  if (staffPromisedLaterReply(staffMsgs)) {
    return { eligible: false, reason: "equipe_pediu_para_aguardar" };
  }

  return { eligible: true, reason: "lead_novo_aguardando_resposta" };
}

async function classifyLeadNoResponseWithAi(
  transcript: string,
): Promise<LeadConversationGateResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || !transcript.trim()) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você decide se um follow-up automático de "lead sem resposta" deve ser enviado no WhatsApp de uma clínica.

eligible=true SOMENTE se:
- É um lead NOVO (primeiro contato)
- A equipe JÁ respondeu
- O lead sumiu / não continuou a conversa
- Faz sentido cobrar retorno comercial de forma gentil

eligible=false se QUALQUER um destes for verdade:
- Atendimento já em andamento (dúvidas, valores, agenda, confirmação, pós-consulta)
- A recepção pediu para aguardar / disse que vai responder depois / verificar algo
- O paciente está só esperando um retorno prometido pela equipe
- A conversa já teve vai-e-volta substancial
- Não faz sentido "puxar" o lead agora

Responda APENAS JSON: {"eligible":boolean,"reason":"texto_curto_em_pt"}`,
          },
          {
            role: "user",
            content: `Transcrição recente:\n${transcript.slice(0, 3500)}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw) as { eligible?: unknown; reason?: unknown };
    if (typeof parsed.eligible !== "boolean") return null;
    return {
      eligible: parsed.eligible,
      reason: typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim().slice(0, 120)
        : parsed.eligible
          ? "ia_elegivel"
          : "ia_nao_elegivel",
    };
  } catch {
    return null;
  }
}

/**
 * Analisa a conversa antes de agendar/enviar lead sem resposta.
 * Heurística primeiro; com OPENAI_API_KEY, confirma com IA.
 */
export async function evaluateLeadNoResponseConversation(input: {
  analysis: LeadGateAnalysis;
  messages?: Msg[];
}): Promise<LeadConversationGateResult> {
  const heuristic = heuristicLeadNoResponseGate(input.analysis);
  if (!heuristic.eligible) return heuristic;

  const rows =
    input.messages?.map((m) => ({
      direction: m.direction,
      body: m.body,
      message_type: m.message_type ?? "text",
      sent_by: m.sent_by,
    })) ??
    input.analysis.recentMessages.map((m) => ({
      direction: m.direction,
      body: m.body,
      message_type: "text",
      sent_by: m.sent_by,
    }));

  const transcript = buildConversationTranscript(rows, 30);
  const ai = await classifyLeadNoResponseWithAi(transcript);
  if (ai) return ai;

  return heuristic;
}
