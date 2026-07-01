import { supabase } from "@/integrations/supabase/client";
import { todayISO, shiftDateISO } from "@/lib/locale";
import { randomUUID } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Item do catálogo do sistema (serviços/procedimentos + estoque/insumos). */
export interface CatalogItem {
  id: string;
  source: "service" | "inventory";
  name: string;
  /** Preço de venda (sempre usado no orçamento). */
  price: number;
  cost: number;
  sessionCount: number;
}

export interface BudgetItemParsed {
  desc: string;
  quantidade: number;
  preco: number;
}

export interface ParsedBudgetData {
  paciente: string;
  frase: string;
  valorFinal: number;
  itens: BudgetItemParsed[];
  beneficios: string[];
  dataFormatada: string;
}

export interface BudgetChatRecord {
  id: string;
  patient_id: string | null;
  budget_id: string | null;
  title: string;
  messages: ChatMessage[];
  has_budget: boolean;
  expires_at: string;
  updated_at: string;
}

/** Mensagem inicial fixa do assistente (UI), antes de qualquer chamada à IA. */
export const BUDGET_WELCOME = `Olá, Dra. Carine! 👋

Pode me informar o *nome do paciente* e os *medicamentos/procedimentos* que deseja orçar.

Eu busco os preços no banco do sistema, monto o resumo e, ao final, gero o orçamento (PDF do paciente) e lanço no financeiro.`;

/* -------------------------------------------------------------------------- */
/* Catálogo do sistema → contexto da IA                                        */
/* -------------------------------------------------------------------------- */

function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Carrega o "banco de medicamentos" do próprio sistema: serviços/procedimentos
 * do profissional/tenant + itens de estoque/insumos. Retorna o texto-contexto
 * (preços de venda) para a IA e a lista estruturada para casar com `service_id`.
 */
export async function loadBudgetCatalog(
  professionalId: string,
  tenantId: string,
): Promise<{ context: string; items: CatalogItem[] }> {
  const [{ data: svcs }, { data: inv }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, default_price, cost_price, session_count, category")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .or(`professional_id.eq.${professionalId},professional_id.is.null`)
      .order("name"),
    supabase
      .from("inventory_items")
      .select("id, name, description, sell_price, cost_price, unit")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name"),
  ]);

  const items: CatalogItem[] = [];
  const lines: string[] = [];

  for (const s of (svcs ?? []) as unknown as Array<{
    id: string;
    name: string;
    default_price: number | null;
    cost_price: number | null;
    session_count: number | null;
    category: string | null;
  }>) {
    const price = Number(s.default_price ?? 0);
    const cost = Number(s.cost_price ?? 0);
    const sessionCount = Number(s.session_count ?? 1);
    items.push({ id: s.id, source: "service", name: s.name, price, cost, sessionCount });
    const cat = s.category ? ` [${s.category}]` : "";
    const sess = sessionCount > 1 ? ` | ${sessionCount} sessões` : "";
    lines.push(`- ${s.name}${cat} | venda R$ ${fmtNum(price)} | custo R$ ${fmtNum(cost)}${sess}`);
  }

  for (const i of (inv ?? []) as unknown as Array<{
    id: string;
    name: string;
    description: string | null;
    sell_price: number | null;
    cost_price: number | null;
    unit: string | null;
  }>) {
    const price = Number(i.sell_price ?? 0);
    const cost = Number(i.cost_price ?? 0);
    items.push({ id: i.id, source: "inventory", name: i.name, price, cost, sessionCount: 1 });
    const apres = i.description ? ` | ${i.description}` : i.unit ? ` | ${i.unit}` : "";
    lines.push(`- ${i.name}${apres} | venda R$ ${fmtNum(price)} | custo R$ ${fmtNum(cost)}`);
  }

  return { context: lines.join("\n"), items };
}

/** Cadastro rápido de medicamento/serviço quando a IA não encontra no banco. */
export async function addMedicationToCatalog(opts: {
  tenantId: string;
  professionalId: string;
  name: string;
  presentation?: string;
  salePrice: number;
  costPrice?: number;
}): Promise<CatalogItem> {
  const { data, error } = await supabase
    .from("services")
    .insert({
      tenant_id: opts.tenantId,
      professional_id: opts.professionalId,
      name: opts.name.trim(),
      category: "Medicamento",
      description: opts.presentation?.trim() || null,
      default_price: opts.salePrice,
      cost_price: opts.costPrice ?? 0,
      session_count: 1,
      active: true,
    } as never)
    .select("id, name, default_price, cost_price, session_count")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao cadastrar medicamento");
  const row = data as unknown as {
    id: string;
    name: string;
    default_price: number;
    cost_price: number | null;
    session_count: number | null;
  };
  return {
    id: row.id,
    source: "service",
    name: row.name,
    price: Number(row.default_price ?? 0),
    cost: Number(row.cost_price ?? 0),
    sessionCount: Number(row.session_count ?? 1),
  };
}

/* -------------------------------------------------------------------------- */
/* Streaming do chat                                                           */
/* -------------------------------------------------------------------------- */

export async function streamBudgetChat(
  messages: ChatMessage[],
  medicamentosContext: string,
  opts: { onToken: (delta: string) => void; signal?: AbortSignal; patientId?: string | null },
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch("/api/budget/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      medicamentos_context: medicamentosContext,
      patient_id: opts.patientId ?? null,
    }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    let msg = `Erro ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          opts.onToken(delta);
        }
      } catch {
        /* fragmento incompleto */
      }
    }
  }

  return full;
}

/* -------------------------------------------------------------------------- */
/* Marcadores especiais                                                        */
/* -------------------------------------------------------------------------- */

export const CADASTRO_MARKER = "[SOLICITAR_CADASTRO]";

export function hasBudgetBlock(text: string): boolean {
  return /\[ORCAMENTO_DADOS\][\s\S]*?\[FIM_ORCAMENTO_DADOS\]/.test(text);
}

export function needsCadastro(text: string): boolean {
  return text.includes(CADASTRO_MARKER);
}

/** Remove os blocos técnicos (ORCAMENTO_DADOS / SOLICITAR_CADASTRO) do texto exibido. */
export function stripBudgetMarkers(text: string): string {
  return text
    .replace(/\[ORCAMENTO_DADOS\][\s\S]*?\[FIM_ORCAMENTO_DADOS\]/g, "")
    .replace(/\[SOLICITAR_CADASTRO\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseMoney(raw: string): number {
  const cleaned = raw
    .replace(/r\$/i, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/* -------------------------------------------------------------------------- */
/* Parser do bloco de orçamento                                                */
/* -------------------------------------------------------------------------- */

export function parseBudget(fullText: string): ParsedBudgetData | null {
  const block = /\[ORCAMENTO_DADOS\]([\s\S]*?)\[FIM_ORCAMENTO_DADOS\]/.exec(fullText);
  if (!block) return null;
  const body = block[1];

  const get = (key: string) => new RegExp(`${key}:\\s*(.+)`, "i").exec(body)?.[1]?.trim() ?? "";

  const paciente = get("PACIENTE") || "Paciente";
  const frase = get("FRASE");
  const valorFinal = parseMoney(get("VALOR_FINAL"));

  const itens: BudgetItemParsed[] = [];
  const itensMatch = /ITENS:\s*([\s\S]*?)(?=BENEFICIOS:|\[FIM_ORCAMENTO_DADOS\]|$)/i.exec(body);
  if (itensMatch) {
    for (const rawLine of itensMatch[1].split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("-")) continue;
      const desc = /DESC:\s*(.+?)\s*;/i.exec(line)?.[1]?.trim() ?? "";
      const qtd = /QTD:\s*([\d.,]+)/i.exec(line)?.[1] ?? "1";
      const preco = /PRECO:\s*([\d.,r$\s]+)/i.exec(line)?.[1] ?? "0";
      if (!desc) continue;
      itens.push({
        desc,
        quantidade: Math.max(1, Math.round(parseFloat(qtd.replace(",", ".")) || 1)),
        preco: parseMoney(preco),
      });
    }
  }

  const beneficios: string[] = [];
  const benMatch = /BENEFICIOS:\s*([\s\S]*?)(?=\[FIM_ORCAMENTO_DADOS\]|$)/i.exec(body);
  if (benMatch) {
    for (const rawLine of benMatch[1].split("\n")) {
      const line = rawLine.trim().replace(/^[-•*]\s*/, "");
      if (line && !/^ITENS:|^VALOR_FINAL:|^PACIENTE:|^FRASE:/i.test(line)) beneficios.push(line);
    }
  }

  // Fallback: se a IA não preencher VALOR_FINAL, soma dos itens.
  const sum = itens.reduce((s, it) => s + it.preco * it.quantidade, 0);
  const valor = valorFinal > 0 ? valorFinal : sum;

  return {
    paciente,
    frase,
    valorFinal: valor,
    itens,
    beneficios,
    dataFormatada: new Date().toLocaleDateString("pt-BR"),
  };
}

/* -------------------------------------------------------------------------- */
/* Lançamento no financeiro (budgets + budget_items + upsert_budget_bill)      */
/* -------------------------------------------------------------------------- */

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Tenta casar a descrição de um item com um serviço do catálogo. */
function matchServiceId(desc: string, catalog: CatalogItem[]): string | null {
  const target = normalizeName(desc);
  if (!target) return null;
  const services = catalog.filter((c) => c.source === "service");
  // match exato primeiro
  const exact = services.find((c) => normalizeName(c.name) === target);
  if (exact) return exact.id;
  // contém o nome do serviço
  const partial = services.find((c) => {
    const n = normalizeName(c.name);
    return n.length >= 4 && (target.includes(n) || n.includes(target));
  });
  return partial?.id ?? null;
}

/**
 * Cria o orçamento no financeiro a partir do bloco de dados parseado.
 * Replica o contrato do formulário manual: insere `budgets` + `budget_items`
 * e chama a RPC `upsert_budget_bill` (cria fatura status 'budget').
 */
export async function createFinancialBudget(opts: {
  tenantId: string;
  professionalId: string;
  patientId: string;
  parsed: ParsedBudgetData;
  catalog: CatalogItem[];
}): Promise<{ budgetId: string; number: number | null }> {
  const { parsed, catalog } = opts;

  const rows = parsed.itens.length
    ? parsed.itens
    : [{ desc: parsed.frase || "Tratamento", quantidade: 1, preco: parsed.valorFinal }];

  const subtotal =
    Math.round(rows.reduce((s, it) => s + it.preco * it.quantidade, 0) * 100) / 100;
  const finalValue = Math.round(parsed.valorFinal * 100) / 100;
  const discountValue = subtotal > finalValue ? Math.round((subtotal - finalValue) * 100) / 100 : 0;
  const discountPercent = subtotal > 0 ? Math.round((discountValue / subtotal) * 10000) / 100 : 0;

  const payload = {
    tenant_id: opts.tenantId,
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    date: todayISO(),
    valid_until: shiftDateISO(todayISO(), 5),
    status: "sent",
    notes: "Gerado pelo Orçamento com IA",
    subtotal,
    discount_percent: discountPercent,
    discount_value: discountValue,
    final_value: finalValue,
  };

  const { data: created, error: budErr } = await supabase
    .from("budgets")
    .insert(payload as never)
    .select("id, number")
    .single();
  if (budErr || !created) throw new Error(budErr?.message ?? "Falha ao criar orçamento");
  const budgetId = (created as unknown as { id: string }).id;
  const number = (created as unknown as { number: number | null }).number ?? null;

  const itemRows = rows.map((it, i) => ({
    budget_id: budgetId,
    service_id: matchServiceId(it.desc, catalog),
    position: i + 1,
    description: it.desc,
    quantity: it.quantidade,
    unit_price: it.preco,
    total_price: Math.round(it.preco * it.quantidade * 100) / 100,
  }));
  const { error: itemsErr } = await supabase.from("budget_items").insert(itemRows as never);
  if (itemsErr) throw new Error(itemsErr.message);

  const { error: billErr } = await supabase.rpc("upsert_budget_bill" as never, {
    p_budget_id: budgetId,
  } as never);
  if (billErr) throw new Error(billErr.message);

  return { budgetId, number };
}

/* -------------------------------------------------------------------------- */
/* Persistência: rascunhos de chat (72h)                                       */
/* -------------------------------------------------------------------------- */

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export async function purgeExpiredBudgetChats(): Promise<void> {
  await supabase.rpc("purge_expired_budget_chats" as never);
}

export async function loadBudgetChats(professionalId: string): Promise<BudgetChatRecord[]> {
  const { data, error } = await supabase
    .from("budget_chats" as never)
    .select("id, patient_id, budget_id, title, messages, has_budget, expires_at, updated_at")
    .eq("professional_id", professionalId)
    .gt("expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BudgetChatRecord[];
}

export async function saveBudgetChat(opts: {
  id: string;
  tenantId: string;
  professionalId: string;
  patientId?: string | null;
  budgetId?: string | null;
  title: string;
  messages: ChatMessage[];
  hasBudget: boolean;
}): Promise<void> {
  const row = {
    id: opts.id,
    tenant_id: opts.tenantId,
    professional_id: opts.professionalId,
    patient_id: opts.patientId ?? null,
    budget_id: opts.budgetId ?? null,
    title: opts.title.slice(0, 120),
    messages: opts.messages,
    has_budget: opts.hasBudget,
    expires_at: new Date(Date.now() + SEVENTY_TWO_HOURS_MS).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("budget_chats" as never)
    .upsert(row as never, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteBudgetChat(id: string): Promise<void> {
  const { error } = await supabase.from("budget_chats" as never).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* PDF do orçamento → histórico do paciente                                    */
/* -------------------------------------------------------------------------- */

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "Paciente"
  );
}

/** Salva o PDF do orçamento no histórico de mídia do prontuário do paciente. */
export async function saveBudgetPdfToHistory(opts: {
  tenantId: string;
  professionalId: string;
  patientId: string;
  patientName: string;
  pdfBlob: Blob;
}): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `Orcamento_-_${slugify(opts.patientName)}_${date.replace(/-/g, "_")}.pdf`;
  const docId = randomUUID();
  const storagePath = `${opts.patientId}/budgets/${docId}/${fileName}`;
  const fileSizeKb = Math.round((opts.pdfBlob.size / 1024) * 100) / 100;

  const { error: upErr } = await supabase.storage
    .from("patient-documents")
    .upload(storagePath, opts.pdfBlob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error: mediaErr } = await supabase.from("patient_media_history" as never).insert({
    id: docId,
    tenant_id: opts.tenantId,
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: "application/pdf",
    file_size_kb: fileSizeKb,
    caption: `Orçamento — ${date.split("-").reverse().join("/")}`,
  } as never);
  if (mediaErr) throw new Error(mediaErr.message);
}
