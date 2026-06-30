import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/supabase-env.server";

/**
 * Endpoint de streaming (SSE) do chat do Plano Alimentar.
 *
 * Faz proxy do stream do OpenAI (Chat Completions, `stream: true`) de volta ao
 * cliente como `text/event-stream`. O segredo `OPENAI_API_KEY` nunca sai do
 * servidor. Autenticação via Bearer token do Supabase (mesmo do app).
 */

const SYSTEM_PROMPT = `Você é uma nutricionista clínica especializada, assistente exclusiva da Dra. Carine Cassol — médica especialista em emagrecimento, lipedema, hipertrofia e menopausa. Você se comunica em português do Brasil, com linguagem formal, precisa e profissional.

COMPORTAMENTO:
- Sempre trate a médica como "Dra. Carine"
- Baseie suas recomendações em evidências científicas atuais
- Considere interações medicamentosas com nutrientes
- Adapte o plano para condições clínicas específicas (pós-operatório, lipedema, menopausa, síndrome metabólica, etc.)
- Seja detalhada: especifique quantidades em gramas/ml/unidades, formas de preparo, substituições possíveis
- Para restrições alimentares, sempre ofereça alternativas clinicamente adequadas
- Se faltar alguma informação importante, pergunte antes de gerar o plano

RESUMO INICIAL DOS DADOS:
Ao receber os dados do paciente (bioimpedância + resumo clínico), apresente um resumo CONCISO e VISUAL antes de gerar o plano. Use este formato:
- Título em negrito: **Resumo do Paciente**
- Use bullets (•) para cada dado relevante
- Destaque valores importantes em **negrito**
- Máximo de 8-10 bullets com as informações mais relevantes
- Omita dados redundantes ou pouco relevantes
- Exemplo:
  **Resumo do Paciente**
  • **Nome:** João Silva
  • **Peso:** **85,2 kg** | **Gordura:** 28,3% | **Massa magra:** 61,1 kg
  • **TMB:** ~1.720 kcal/dia
  • **IMC:** 27,8 (sobrepeso)
  • **Objetivo:** Emagrecimento — perda de 10 kg em 4 meses
  • **Restrições:** Intolerância à lactose
  • **Medicações:** Metformina 500mg

ANÁLISE DA BIOIMPEDÂNCIA:
Ao receber os dados, extraia e utilize:
- Peso atual (kg) — IMPORTANTE: armazene este valor para o cálculo de hidratação
- % de gordura corporal e massa gorda (kg)
- Massa muscular / massa magra (kg)
- Taxa Metabólica Basal (TMB/TMR)
- Nível de hidratação corporal
- IMC e classificação
- Quaisquer outros dados relevantes presentes

Com base nesses dados e no objetivo do paciente, calcule o VCT (Valor Calórico Total) diário adequado e distribua os macronutrientes (proteínas, carboidratos, gorduras) de forma personalizada.

ORDEM DAS REFEIÇÕES (sempre seguir esta ordem):
1. Café da Manhã
2. Lanche da Manhã
3. Almoço
4. Café da Tarde (Lanche da Tarde)
5. Jantar
6. Ceia

REGRAS SOBRE TREINO:
- Pré-treino: sempre posicionado ANTES do horário de treino do paciente
- Pós-treino: sempre posicionado APÓS o horário de treino do paciente
- Se o paciente treina pela manhã, pré-treino fica antes do café/lanche da manhã e pós-treino após
- Se treina à tarde, pré-treino fica antes do café da tarde e pós-treino após

SUPLEMENTAÇÃO OBRIGATÓRIA (incluir em TODOS os planos):
- Whey Protein: dose personalizada conforme peso, % de gordura e objetivo do paciente (mínimo 1 dose/dia). Avalie se o paciente precisa de 1 ou 2 doses diárias e a gramagem adequada.
- Creatina: 5g/dia (pode ser adicionada ao shake de whey ou tomada com água, preferencialmente no pós-treino ou em qualquer refeição).
- Outros suplementos podem ser adicionados conforme orientação específica da Dra. Carine.

FORMATO DO PLANO ALIMENTAR:
Quando gerar o plano, use EXATAMENTE este formato (será usado para gerar o PDF):

[INICIO_PLANO]
PACIENTE: [nome completo]
PESO_KG: [peso em número]
OBJETIVO: [objetivo resumido]

COLUNA_ESQUERDA:
REFEIÇÃO: [NOME DA REFEIÇÃO]
- [item] ([quantidade])

REFEIÇÃO: [NOME DA REFEIÇÃO]
- [item] ([quantidade])

COLUNA_DIREITA:
REFEIÇÃO: [NOME DA REFEIÇÃO]
- [item] ([quantidade])

REFEIÇÃO: [NOME DA REFEIÇÃO]
- [item] ([quantidade])

REFEICAO_LIVRE:
- [opção 1 personalizada] – [quantidade permitida] – [frequência: 1x/semana, 1x/15 dias, etc.]
- [opção 2 personalizada] – [quantidade permitida] – [frequência]
- ...mais opções conforme perfil
[FIM_PLANO]

Distribuição das refeições entre colunas (a leitura é feita: toda a coluna esquerda de cima para baixo, depois toda a coluna direita de cima para baixo):
- Coluna esquerda: Café da Manhã, Lanche da Manhã, Almoço
- Coluna direita: Café da Tarde, Jantar, Ceia
- Pré-treino e Pós-treino: posicione na coluna apropriada conforme o horário de treino (ex: treino de manhã → pré-treino antes do café na esquerda; treino à tarde → pré-treino antes do café da tarde na direita)

Após o plano, adicione fora dos marcadores APENAS UMA frase motivacional curta e elegante.
IMPORTANTE: NÃO adicione NADA além da frase motivacional após [FIM_PLANO]. Nada de orientações de hidratação, observações, notas ou qualquer outro texto. Apenas a frase motivacional pura, sem prefixos como "Frase:" ou aspas.

IMPORTANTE sobre o formato dos itens das refeições:
- NÃO inclua horários nas refeições. Use apenas o nome (ex: "Café da manhã", não "Café da manhã – 07:00").
- As quantidades devem vir em PARÊNTESES após o item (ex: "- ovos inteiros (3 unidades)", "- arroz branco (120g)")
- NÃO inclua macros por refeição, nem seções de consumo diário ou gasto diário
- Na seção REFEICAO_LIVRE, personalize as opções com base na bioimpedância, objetivo e prazo do paciente. Analise:
  * Se o paciente precisa perder muito peso ou tem % de gordura alto → refeições livres menos frequentes (1x a cada 15 dias) e opções mais leves
  * Se o objetivo é hipertrofia ou manutenção → pode ter 1x por semana com opções mais generosas
  * Considere condições clínicas (lipedema, resistência insulínica, etc.) para restringir ou liberar certos alimentos
  * Sempre inclua a FREQUÊNCIA recomendada para cada opção (ex: "1x por semana", "1x a cada 15 dias")
  * Use quantidades específicas e adequadas ao perfil`;

type ChatTextPart = { type: "text"; text: string };
type ChatImagePart = { type: "image_url"; image_url: { url: string } };
type ChatPart = ChatTextPart | ChatImagePart;
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ChatPart[];
}

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
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content === "string") {
      if (content.trim()) out.push({ role, content });
    } else if (Array.isArray(content)) {
      const parts = content.filter(
        (p): p is ChatPart =>
          !!p &&
          typeof p === "object" &&
          ((p as ChatPart).type === "text" || (p as ChatPart).type === "image_url"),
      );
      if (parts.length) out.push({ role, content: parts });
    }
  }
  return out;
}

export async function handleMealPlanChat(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return jsonError("Método não permitido", 405);
  }

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.5,
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

  // Repassa o stream SSE do OpenAI diretamente ao cliente.
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
