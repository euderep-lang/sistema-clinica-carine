import { buildConversationTranscript } from "@/lib/wa-funnel-ai.server";

type WaMessageRow = {
  direction: "inbound" | "outbound";
  body: string | null;
  message_type: string;
  sent_by: string | null;
};

export type HumanizeQuickReplyResult = {
  configured: boolean;
  text: string;
  usedAi: boolean;
};

/** Preserva dados factuais (datas, horários, links, nomes) ao reescrever. */
function extractMustKeepTokens(message: string): string[] {
  const tokens = new Set<string>();
  const patterns = [
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b\d{1,2}:\d{2}\b/g,
    /https?:\/\/[^\s]+/gi,
    /\{\{[^}]+\}\}/g,
  ];
  for (const re of patterns) {
    for (const m of message.match(re) ?? []) tokens.add(m);
  }
  return [...tokens];
}

function mustKeepTokensPresent(original: string, rewritten: string): boolean {
  const tokens = extractMustKeepTokens(original);
  if (tokens.length === 0) return true;
  const lower = rewritten.toLowerCase();
  return tokens.every((t) => {
    const needle = t.replace(/[{}]/g, "").toLowerCase();
    if (needle.length <= 2) return true;
    return lower.includes(needle) || rewritten.includes(t);
  });
}

export async function humanizeQuickReplyMessage(input: {
  message: string;
  patientFirstName?: string | null;
  clinicName?: string | null;
  recentTranscript?: string | null;
}): Promise<HumanizeQuickReplyResult> {
  const base = input.message.trim();
  if (!base) return { configured: false, text: base, usedAi: false };

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { configured: false, text: base, usedAi: false };
  }

  const system = `Você reescreve mensagens de WhatsApp de clínica de saúde para parecerem naturais e humanas — como se uma atendente real estivesse digitando agora.

Regras OBRIGATÓRIAS:
- Mantenha EXATAMENTE o mesmo significado, intenção e informações factuais (datas, horários, nomes, valores, links, perguntas)
- NÃO invente fatos, promessas ou detalhes novos
- Português do Brasil, tom acolhedor e profissional (WhatsApp)
- Varie estrutura, ordem das frases e vocabulário — cada reescrita deve ser claramente diferente da mensagem base
- SEMPRE se refira ao paciente pelo PRIMEIRO NOME fornecido — nunca use nome completo, sobrenome ou "paciente"
- Se a mensagem base tiver nome completo, substitua pelo primeiro nome
- NÃO use markdown, asteriscos de formatação nem emojis em excesso
- Responda APENAS com o texto final da mensagem, sem aspas, prefixos ou explicação
- Tamanho similar ao original (±25%)`;

  const user = [
    input.clinicName ? `Clínica: ${input.clinicName}` : null,
    input.patientFirstName
      ? `Primeiro nome do paciente (use SEMPRE este nome): ${input.patientFirstName}`
      : "Primeiro nome do paciente: desconhecido — evite usar nome completo inventado",
    input.recentTranscript?.trim()
      ? `Contexto recente do chat (tom e assunto):\n${input.recentTranscript.slice(0, 2500)}`
      : null,
    `Mensagem base (reformule sem copiar literalmente):\n${base}`,
    `Identificador de variação: ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
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
        temperature: 0.88,
      }),
    });

    if (!res.ok) {
      return { configured: true, text: base, usedAi: false };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const rewritten = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!rewritten || rewritten === base) {
      return { configured: true, text: base, usedAi: false };
    }
    if (!mustKeepTokensPresent(base, rewritten)) {
      return { configured: true, text: base, usedAi: false };
    }

    const normalized = normalizeOutboundPatientName(rewritten, {
      firstName: input.patientFirstName,
      fullName: null,
    });

    return { configured: true, text: normalized, usedAi: true };
  } catch {
    return { configured: true, text: base, usedAi: false };
  }
}

export async function fetchConversationTranscriptForHumanize(
  conversationId: string,
  limit = 12,
): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("direction, body, message_type, sent_by")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = ((data ?? []) as WaMessageRow[]).reverse();
  return buildConversationTranscript(rows, limit);
}

export function firstNameFromLabel(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Substitui nome completo pelo primeiro nome e garante tratamento informal. */
export function normalizeOutboundPatientName(
  message: string,
  options: { firstName?: string | null; fullName?: string | null },
): string {
  let text = message.trim();
  if (!text) return text;

  const firstName = options.firstName?.trim();
  const fullName = options.fullName?.trim();
  if (!firstName) return text;

  if (fullName && fullName.length > firstName.length && fullName.toLowerCase() !== firstName.toLowerCase()) {
    text = text.replace(new RegExp(escapeRegExp(fullName), "gi"), firstName);
  }

  return text;
}

/** Alias semântico — mesma lógica para quick replies, envio manual e automações. */
export const humanizeOutboundCrmMessage = humanizeQuickReplyMessage;

type OutboundPatientContext = {
  clinicName: string | null;
  patientFirstName: string | null;
  patientFullName: string | null;
  recentTranscript: string | null;
};

async function resolveOutboundPatientContext(
  tenantId: string,
  options?: {
    conversationId?: string | null;
    patientFirstName?: string | null;
    contactName?: string | null;
    loadTranscript?: boolean;
  },
): Promise<OutboundPatientContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let patientFirstName = options?.patientFirstName ?? null;
  let patientFullName = options?.contactName?.trim() ?? null;

  const tenantPromise = supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  const transcriptPromise =
    options?.loadTranscript && options?.conversationId
      ? fetchConversationTranscriptForHumanize(options.conversationId)
      : Promise.resolve("");

  let convPromise: Promise<{ contact_name: string | null; patients: { full_name: string } | null } | null> =
    Promise.resolve(null);
  if (options?.conversationId) {
    convPromise = supabaseAdmin
      .from("wa_conversations" as never)
      .select("contact_name, patients(full_name)")
      .eq("id", options.conversationId)
      .maybeSingle()
      .then(({ data }) => (data as { contact_name: string | null; patients: { full_name: string } | null } | null) ?? null);
  }

  const [tenantRes, transcript, conv] = await Promise.all([tenantPromise, transcriptPromise, convPromise]);

  patientFullName =
    conv?.patients?.full_name?.trim() ??
    conv?.contact_name?.trim() ??
    patientFullName;

  if (!patientFirstName) {
    patientFirstName = firstNameFromLabel(patientFullName);
  }

  return {
    clinicName: tenantRes.data?.name ?? null,
    patientFirstName,
    patientFullName,
    recentTranscript: transcript.trim() || null,
  };
}

function finishOutboundPatientName(text: string, ctx: OutboundPatientContext): string {
  return normalizeOutboundPatientName(text, {
    firstName: ctx.patientFirstName,
    fullName: ctx.patientFullName,
  });
}

/** Envio manual: só normaliza primeiro nome (sem IA). */
export async function normalizeManualOutboundMessage(
  tenantId: string,
  message: string,
  options?: {
    conversationId?: string | null;
    patientFirstName?: string | null;
    contactName?: string | null;
  },
): Promise<string> {
  const base = message.trim();
  if (!base) return base;
  const ctx = await resolveOutboundPatientContext(tenantId, { ...options, loadTranscript: false });
  return finishOutboundPatientName(base, ctx);
}

/**
 * Reformula mensagem outbound com IA + contexto (follow-ups, agendadas, fora do horário).
 * Sem OPENAI_API_KEY, apenas normaliza o primeiro nome.
 */
export async function humanizeForConversation(
  tenantId: string,
  message: string,
  options?: {
    conversationId?: string | null;
    patientFirstName?: string | null;
    contactName?: string | null;
  },
): Promise<string> {
  const base = message.trim();
  if (!base) return base;

  const ctx = await resolveOutboundPatientContext(tenantId, { ...options, loadTranscript: true });

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return finishOutboundPatientName(base, ctx);
  }

  const result = await humanizeQuickReplyMessage({
    message: base,
    clinicName: ctx.clinicName,
    patientFirstName: ctx.patientFirstName,
    recentTranscript: ctx.recentTranscript,
  });

  return finishOutboundPatientName(result.text, ctx);
}

/** Reformulação com IA sob demanda (botão no composer). */
export async function humanizeComposerMessage(
  tenantId: string,
  message: string,
  options?: {
    conversationId?: string | null;
    patientFirstName?: string | null;
    contactName?: string | null;
  },
): Promise<{ configured: boolean; text: string; usedAi: boolean }> {
  const base = message.trim();
  if (!base) return { configured: false, text: base, usedAi: false };

  const ctx = await resolveOutboundPatientContext(tenantId, { ...options, loadTranscript: true });

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      configured: false,
      text: finishOutboundPatientName(base, ctx),
      usedAi: false,
    };
  }

  const result = await humanizeQuickReplyMessage({
    message: base,
    clinicName: ctx.clinicName,
    patientFirstName: ctx.patientFirstName,
    recentTranscript: ctx.recentTranscript,
  });

  const text = finishOutboundPatientName(result.text, ctx);
  return {
    configured: true,
    text,
    usedAi: result.usedAi,
  };
}
