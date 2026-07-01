import { createClient } from "@supabase/supabase-js";
import { buildAiSystemContext, loadAiProfessional } from "@/lib/ai-context.server";
import { buildBudgetSystemPrompt } from "@/lib/ai-prompts.server";
import { getSupabaseServerEnv } from "@/lib/supabase-env.server";

/**
 * Endpoint de streaming (SSE) do chat de Orçamento.
 * Contexto do sistema montado no servidor + instruções customizadas do profissional.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

async function authenticate(request: Request): Promise<string | null> {
  const { url, publishableKey } = getSupabaseServerEnv();
  if (!url || !publishableKey) return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  const supabase = createClient(url, publishableKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      out.push({ role, content });
    }
  }
  return out;
}

export async function handleBudgetChat(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") return jsonError("Método não permitido", 405);

  const userId = await authenticate(request);
  if (!userId) return jsonError("Não autorizado", 401);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return jsonError(
      "IA indisponível: configure OPENAI_API_KEY no servidor (Vercel → Environment Variables).",
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Corpo inválido", 400);
  }

  const messages = sanitizeMessages((body as { messages?: unknown })?.messages);
  if (messages.length === 0) return jsonError("Nenhuma mensagem informada", 400);

  const patientId =
    typeof (body as { patient_id?: unknown }).patient_id === "string"
      ? (body as { patient_id: string }).patient_id
      : null;
  const clientCatalog = String((body as { medicamentos_context?: unknown })?.medicamentos_context ?? "");

  const prof = await loadAiProfessional(userId);
  if (!prof) return jsonError("Perfil não encontrado", 403);

  let systemContext = "";
  try {
    systemContext = await buildAiSystemContext(prof, { patientId });
  } catch (e) {
    console.error("[budget-chat] context build failed", e);
    systemContext = clientCatalog;
  }

  const systemPrompt = buildBudgetSystemPrompt(prof, systemContext, clientCatalog);
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.4,
        stream: true,
      }),
    });
  } catch {
    return jsonError("Falha ao contactar a IA.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 502;
    const msg =
      status === 429
        ? "Limite de requisições da IA atingido. Tente novamente em instantes."
        : status === 402
          ? "Créditos da IA insuficientes."
          : `IA indisponível (${upstream.status}). ${detail.slice(0, 200)}`;
    return jsonError(msg, status);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}
