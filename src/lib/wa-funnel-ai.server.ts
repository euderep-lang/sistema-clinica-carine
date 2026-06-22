type PipelineStage = { id: string; name: string; sort_order: number };

type MessageRow = {
  direction: "inbound" | "outbound";
  body: string | null;
  message_type: string;
  sent_by: string | null;
};

export type FunnelStageSuggestion = {
  configured: boolean;
  stageId: string | null;
  stageName: string | null;
  confidence: number;
  reason: string;
  currentStageName?: string | null;
};

function formatTranscriptLine(m: MessageRow): string | null {
  const who = m.direction === "inbound" ? "Paciente" : m.sent_by ? "Equipe" : "Clínica";
  const type = m.message_type ?? "text";

  if (type === "audio") return `${who}: [áudio — ainda sem transcrição automática]`;
  if (type === "image") return `${who}: [imagem — ainda sem análise automática]`;
  if (type === "video") return `${who}: [vídeo]`;
  if (type === "document") return `${who}: [documento]`;

  const text = m.body?.trim();
  if (!text || text === "🎤 Áudio") return null;
  return `${who}: ${text}`;
}

export function buildConversationTranscript(messages: MessageRow[], limit = 40): string {
  const lines = messages
    .slice(-limit)
    .map(formatTranscriptLine)
    .filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

function matchStage(stages: PipelineStage[], stageName: string): PipelineStage | null {
  const normalized = stageName.trim().toLowerCase();
  return (
    stages.find((s) => s.name.trim().toLowerCase() === normalized) ??
    stages.find((s) => normalized.includes(s.name.trim().toLowerCase())) ??
    stages.find((s) => s.name.trim().toLowerCase().includes(normalized)) ??
    null
  );
}

export async function suggestFunnelStageFromTranscript(input: {
  transcript: string;
  stages: PipelineStage[];
  currentStageName?: string | null;
  contactName?: string | null;
}): Promise<FunnelStageSuggestion> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      configured: false,
      stageId: null,
      stageName: null,
      confidence: 0,
      reason: "Configure OPENAI_API_KEY no servidor (.env local ou Vercel → Environment Variables).",
      currentStageName: input.currentStageName,
    };
  }

  if (!input.transcript.trim()) {
    return {
      configured: true,
      stageId: null,
      stageName: null,
      confidence: 0,
      reason: "Sem mensagens de texto suficientes para analisar.",
      currentStageName: input.currentStageName,
    };
  }

  const stageList = [...input.stages]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.name)
    .join("\n- ");

  const system = `Você classifica leads de clínica médica/estética em etapas de funil de vendas WhatsApp.
Use APENAS um dos nomes EXATOS abaixo:
- ${stageList}

Responda somente JSON válido:
{"stage_name":"nome exato da etapa","confidence":0-100,"reason":"1 frase curta em português"}

Regras:
- Baseie-se só no histórico
- "Ganho" só com confirmação clara de agendamento fechado ou compra
- "Perdido" só com recusa explícita
- Na dúvida, prefira etapa mais inicial (conservador)
- Ignore metadados de mídia não transcrita`;

  const user = [
    input.contactName ? `Contato: ${input.contactName}` : null,
    input.currentStageName ? `Etapa atual no funil: ${input.currentStageName}` : null,
    "Histórico recente:",
    input.transcript.slice(0, 10000),
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    return {
      configured: true,
      stageId: null,
      stageName: null,
      confidence: 0,
      reason: `IA indisponível (${res.status}). Tente novamente.`,
      currentStageName: input.currentStageName,
    };
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "{}";

  let parsed: { stage_name?: string; confidence?: number; reason?: string };
  try {
    parsed = JSON.parse(raw) as { stage_name?: string; confidence?: number; reason?: string };
  } catch {
    return {
      configured: true,
      stageId: null,
      stageName: null,
      confidence: 0,
      reason: "Resposta da IA inválida. Tente novamente.",
      currentStageName: input.currentStageName,
    };
  }

  const stageName = parsed.stage_name?.trim() ?? "";
  const matched = stageName ? matchStage(input.stages, stageName) : null;

  return {
    configured: true,
    stageId: matched?.id ?? null,
    stageName: matched?.name ?? (stageName || null),
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    reason: parsed.reason?.trim() || "Sem justificativa.",
    currentStageName: input.currentStageName,
  };
}
