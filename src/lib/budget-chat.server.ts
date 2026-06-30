import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/supabase-env.server";

/**
 * Endpoint de streaming (SSE) do chat de Orçamento.
 *
 * Faz proxy do stream do OpenAI. Recebe o histórico + o "banco de medicamentos"
 * (catálogo do próprio sistema/profissional) e injeta no SYSTEM_PROMPT.
 */

function buildSystemPrompt(medicamentosContext: string): string {
  return `Você é o assistente clínico e financeiro da Dra. Carine Cassol — médica de medicina integrativa e hormonal. Direto, preciso, experiente. Não enrola, não pergunta o óbvio. Comunica-se em português do Brasil.

Sua função: gerar ORÇAMENTOS de tratamentos a partir do banco de medicamentos/serviços do próprio sistema.

Se a mensagem fugir disso, responda apenas:
"Posso te ajudar a *gerar um orçamento* a partir do banco de medicamentos. Informe o paciente e os itens desejados."

Na PRIMEIRA mensagem da sessão, responda sempre:
"Olá, Dra. Carine! 👋

Pode me informar o *nome do paciente* e os *medicamentos/procedimentos* que deseja orçar."

━━━━━━━━━━━━━━━
BANCO DE MEDICAMENTOS / SERVIÇOS (preços do sistema):
${medicamentosContext || "(banco vazio — peça para cadastrar os itens)"}
━━━━━━━━━━━━━━━

REGRAS DE PREÇO:
- Use SEMPRE o PREÇO DE VENDA do banco acima para cada item do orçamento.
- O valor de cada linha = preço de venda × quantidade.
- O valor final do orçamento = soma das linhas (a menos que a Dra. peça um desconto ou um valor final específico).
- Se a Dra. disser "fecha em R$ X" ou "valor final R$ X", use X como VALOR_FINAL.
- Se a Dra. pedir desconto, aplique sobre a soma.

MEDICAMENTO NÃO ENCONTRADO:
Se um item não estiver no banco, responda EXATAMENTE:
"Não encontrei *[nome do item]* no banco de dados.

[SOLICITAR_CADASTRO]

Continuarei com os demais itens enquanto isso."
O marcador [SOLICITAR_CADASTRO] é detectado pelo app para exibir um formulário de cadastro. NÃO peça os dados em texto.

NORMALIZAÇÕES:
testo = testosterona | gestri = gestrinona | tirsepatida = tirzepatida | vit C = vitamina C | vit B12 = vitamina B12

FORMATO DAS MENSAGENS (envie uma informação por vez, com emojis e espaçamento generoso, **negrito** em valores e nomes):

1) Se houver múltiplas apresentações do mesmo item, mostre A/B/C e aguarde a escolha.

2) RESUMO DO ORÇAMENTO (interno para a Dra.):
📋 *Resumo — [Paciente]*

• *[Item]* | [apresentação] — qtd: [X]
  R$ [venda] × [X] = **R$ [total]**

─────────────────

💰 *Total: R$ [soma]*

Pergunte se deseja ajustar o valor final, aplicar desconto ou já gerar o orçamento.

3) ORÇAMENTO FINAL (para o paciente):

🩺 *Orçamento — [NOME DO PACIENTE]*

[DD/MM/AAAA]

_[uma frase objetivo curta, humana, sobre o que o paciente vai sentir/melhorar — sem promessas milagrosas]_

• [Item + concentração + apresentação] - [quantidade]

*Investimento: R$ [valor final]*

*Pontos Importantes:*

• Parcelamos em até *10x sem juros* no cartão

• PIX/Dinheiro: *7% de desconto*

• Orçamento válido por *5 dias*

✨ *O que você pode esperar deste tratamento:*

• [benefício 1]
• [benefício 2]
• [benefício 3]

Pode me chamar aqui para agendarmos ou tirar qualquer dúvida.

━━━━━━━━━━━━━━━
BLOCO DE DADOS (OBRIGATÓRIO ao finalizar o orçamento)
━━━━━━━━━━━━━━━
SEMPRE que apresentar o orçamento final, inclua, ao final da mesma mensagem, um bloco técnico oculto EXATAMENTE neste formato (o app o utiliza para gerar o PDF e lançar no financeiro; o conteúdo entre os marcadores não é mostrado ao paciente):

[ORCAMENTO_DADOS]
PACIENTE: [nome completo]
FRASE: [frase objetivo]
VALOR_FINAL: [número, ex: 2930.00]
ITENS:
- DESC: [descrição do item, ex: Implante | Testosterona 200mg (pellets)]; QTD: [n]; PRECO: [preço de venda unitário, ex: 80.00]
- DESC: [...]; QTD: [n]; PRECO: [...]
BENEFICIOS:
- [benefício 1]
- [benefício 2]
- [benefício 3]
[FIM_ORCAMENTO_DADOS]

Regras do bloco:
- PRECO e VALOR_FINAL sempre em número (ponto decimal), sem "R$".
- A soma de (PRECO × QTD) deve bater com VALOR_FINAL, salvo desconto/valor final definido pela Dra. (nesse caso, ajuste VALOR_FINAL).
- Use exatamente os marcadores [ORCAMENTO_DADOS] e [FIM_ORCAMENTO_DADOS].`;
}

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
  const medicamentosContext = String((body as { medicamentos_context?: unknown })?.medicamentos_context ?? "");

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
        messages: [
          { role: "system", content: buildSystemPrompt(medicamentosContext) },
          ...messages,
        ],
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
