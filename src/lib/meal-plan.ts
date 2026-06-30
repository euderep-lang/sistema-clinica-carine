import { supabase } from "@/integrations/supabase/client";
import { randomUUID } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ChatPart[];
}

export interface PlanMealItem {
  texto: string;
  quantidade: string;
}

export interface PlanMeal {
  nome: string;
  horario: string;
  itens: PlanMealItem[];
}

export interface ParsedPlanData {
  paciente: string;
  pesoKg: number;
  objetivo: string;
  colunaEsquerda: PlanMeal[];
  colunaDireita: PlanMeal[];
  litrosAgua: string;
  fraseMotivacional: string;
  refeicaoLivre: string[];
}

export interface MealPlanRecord {
  id: string;
  patient_id: string | null;
  patient_name: string;
  peso_kg: number | null;
  objetivo: string | null;
  cid: string | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
}

export interface MealPlanChatRecord {
  id: string;
  patient_id: string | null;
  title: string;
  messages: ChatMessage[];
  has_plan: boolean;
  expires_at: string;
  updated_at: string;
}

/** Mensagem inicial fixa do assistente (UI), antes de qualquer chamada à IA. */
export const MEAL_PLAN_WELCOME = `Olá, Dra. Carine! 😊 É um prazer trabalhar com a senhora hoje.

Para iniciarmos a elaboração do plano terapêutico personalizado, preciso de algumas informações:

**1. Nome completo do paciente**
**2. PDF ou foto da bioimpedância** — anexe pelo botão de clipe (📎)
**3. Breve resumo clínico**, informando:
   • Objetivo principal (emagrecimento, hipertrofia, manutenção, etc.)
   • Intolerâncias e alergias alimentares
   • Medicações em uso
   • Condições clínicas relevantes (doenças, cirurgias recentes, etc.)
   • Outras informações que considere importantes

Assim que receber tudo isso, montarei um plano completo e personalizado para o seu paciente.`;

/* -------------------------------------------------------------------------- */
/* Helpers de mensagem                                                         */
/* -------------------------------------------------------------------------- */

/** Texto exibível de uma mensagem (ignora partes de imagem). */
export function messageText(content: string | ChatPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is Extract<ChatPart, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

/** Indica se a mensagem contém alguma imagem anexada. */
export function messageHasImage(content: string | ChatPart[]): boolean {
  return Array.isArray(content) && content.some((p) => p.type === "image_url");
}

/** Versão "leve" para persistência (remove data URLs de imagens). */
function lightenMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (typeof m.content === "string") return m;
    const text = messageText(m.content);
    const hadImage = messageHasImage(m.content);
    const note = hadImage ? `${text ? `${text}\n\n` : ""}📎 [anexo de bioimpedância]` : text;
    return { role: m.role, content: note };
  });
}

/* -------------------------------------------------------------------------- */
/* Extração de texto de PDF (bioimpedância) — pdfjs-dist no navegador          */
/* -------------------------------------------------------------------------- */

let pdfWorkerConfigured = false;

export async function extractTextFromPdf(file: File | Blob): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
    pdfWorkerConfigured = true;
  }

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as Array<{ str?: string; transform?: number[] }>).filter(
      (i): i is { str: string; transform: number[] } =>
        typeof i.str === "string" && Array.isArray(i.transform),
    );

    const lines: { y: number; parts: { x: number; str: string }[] }[] = [];
    for (const it of items) {
      const x = it.transform[4];
      const y = it.transform[5];
      const line = lines.find((l) => Math.abs(l.y - y) <= 2);
      if (line) line.parts.push({ x, str: it.str });
      else lines.push({ y, parts: [{ x, str: it.str }] });
    }
    lines.sort((a, b) => b.y - a.y);
    let text = lines
      .map((l) =>
        l.parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" | "),
      )
      .join("\n");

    const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    if (text.length < 500 || letters < 100) {
      text = items.map((i) => i.str).join(" ");
    }
    pages.push(`## Page ${p}\n${text}`);
  }

  return pages.join("\n\n");
}

/** Converte um arquivo de imagem para data URL (para visão da IA). */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------------------- */
/* Streaming do chat                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Envia o histórico ao endpoint de streaming e invoca `onToken` a cada pedaço
 * de texto recebido. Retorna o conteúdo completo da resposta do assistente.
 */
export async function streamMealPlanChat(
  messages: ChatMessage[],
  opts: { onToken: (delta: string) => void; signal?: AbortSignal },
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await fetch("/api/meal-plan/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
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
        /* fragmento incompleto — ignora */
      }
    }
  }

  return full;
}

/* -------------------------------------------------------------------------- */
/* Parser do plano                                                             */
/* -------------------------------------------------------------------------- */

export function hasPlanBlock(text: string): boolean {
  return /\[INICIO_PLANO\][\s\S]*?\[FIM_PLANO\]/.test(text);
}

function parseMealSection(block: string): PlanMeal[] {
  const meals: PlanMeal[] = [];
  let current: PlanMeal | null = null;
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const mealMatch = /^REFEI[ÇC][ÃA]O:\s*(.+)$/i.exec(line);
    if (mealMatch) {
      const value = mealMatch[1].trim();
      const [nomePart, horarioPart] = value.split("–");
      current = {
        nome: (nomePart ?? value).trim(),
        horario: (horarioPart ?? "").trim(),
        itens: [],
      };
      meals.push(current);
      continue;
    }
    if (/^MACROS:/i.test(line)) continue;
    if (line.startsWith("-")) {
      if (!current) {
        current = { nome: "", horario: "", itens: [] };
        meals.push(current);
      }
      const itemText = line.replace(/^-\s*/, "");
      const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(itemText);
      if (m) current.itens.push({ texto: m[1].trim(), quantidade: m[2].trim() });
      else current.itens.push({ texto: itemText, quantidade: "" });
    }
  }
  return meals;
}

export function parsePlano(fullText: string): ParsedPlanData | null {
  const blockMatch = /\[INICIO_PLANO\]([\s\S]*?)\[FIM_PLANO\]/.exec(fullText);
  if (!blockMatch) return null;
  const plan = blockMatch[1].trim();

  const get = (key: string) => {
    const re = new RegExp(`${key}:\\s*(.+)`, "i");
    return re.exec(plan)?.[1]?.trim() ?? "";
  };

  const paciente = get("PACIENTE") || "Paciente";
  const pesoKg = parseFloat(get("PESO_KG").replace(",", ".")) || 0;
  const objetivo = get("OBJETIVO");

  const sectionRe = (name: string) =>
    new RegExp(
      `${name}:([\\s\\S]*?)(?=COLUNA_|CONSUMO_DIARIO|GASTO_DIARIO|REFEICAO_LIVRE|REFEI[ÇC][ÃA]O_LIVRE|$)`,
      "i",
    );

  const esqMatch = sectionRe("COLUNA_ESQUERDA").exec(plan);
  const dirMatch = sectionRe("COLUNA_DIREITA").exec(plan);
  const colunaEsquerda = esqMatch ? parseMealSection(esqMatch[1]) : [];
  const colunaDireita = dirMatch ? parseMealSection(dirMatch[1]) : [];

  const livreMatch = /REFEI[ÇC][ÃA]O_LIVRE:([\s\S]*?)(?=\[FIM_PLANO\]|$)/i.exec(plan);
  const refeicaoLivre = livreMatch
    ? livreMatch[1]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("-"))
        .map((l) => l.replace(/^-\s*/, "").trim())
    : [];

  const litrosAgua = ((pesoKg * 35) / 1000).toFixed(1);

  // Frase motivacional: texto após [FIM_PLANO], filtrado.
  const afterIdx = fullText.indexOf("[FIM_PLANO]");
  let fraseMotivacional = "";
  if (afterIdx >= 0) {
    const after = fullText.slice(afterIdx + "[FIM_PLANO]".length);
    const skip = /hidrata|observa|nota|importante|lembrete|dra\.|dra |qualquer dúvida|bom trabalho/i;
    const candidate = after
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("💧") && !/^[*\-•]/.test(l) && !skip.test(l))
      .map((l) => l.replace(/^Frase:\s*/i, "").replace(/^["“”']+|["“”']+$/g, "").trim())
      .find((l) => l.length > 5 && l.length < 200);
    fraseMotivacional = candidate ?? "";
  }

  return {
    paciente,
    pesoKg,
    objetivo,
    colunaEsquerda,
    colunaDireita,
    litrosAgua,
    fraseMotivacional,
    refeicaoLivre,
  };
}

/* -------------------------------------------------------------------------- */
/* Persistência: rascunhos de chat (72h) + planos gerados                     */
/* -------------------------------------------------------------------------- */

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

export async function purgeExpiredChats(): Promise<void> {
  await supabase.rpc("purge_expired_meal_plan_chats" as never);
}

export async function loadMealPlanChats(professionalId: string): Promise<MealPlanChatRecord[]> {
  const { data, error } = await supabase
    .from("meal_plan_chats" as never)
    .select("id, patient_id, title, messages, has_plan, expires_at, updated_at")
    .eq("professional_id", professionalId)
    .gt("expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MealPlanChatRecord[];
}

export async function saveMealPlanChat(opts: {
  id: string;
  tenantId: string;
  professionalId: string;
  patientId?: string | null;
  title: string;
  messages: ChatMessage[];
  hasPlan: boolean;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + SEVENTY_TWO_HOURS_MS).toISOString();
  const row = {
    id: opts.id,
    tenant_id: opts.tenantId,
    professional_id: opts.professionalId,
    patient_id: opts.patientId ?? null,
    title: opts.title.slice(0, 120),
    messages: lightenMessages(opts.messages),
    has_plan: opts.hasPlan,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("meal_plan_chats" as never)
    .upsert(row as never, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteMealPlanChat(id: string): Promise<void> {
  const { error } = await supabase.from("meal_plan_chats" as never).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadMealPlans(
  professionalId: string,
  patientId?: string | null,
): Promise<MealPlanRecord[]> {
  let query = supabase
    .from("meal_plans" as never)
    .select(
      "id, patient_id, patient_name, peso_kg, objetivo, cid, storage_bucket, storage_path, created_at",
    )
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MealPlanRecord[];
}

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "Paciente"
  );
}

/** Gera uma URL assinada (download) para um plano salvo. */
export async function getMealPlanUrl(record: MealPlanRecord): Promise<string> {
  const { data, error } = await supabase.storage
    .from(record.storage_bucket)
    .createSignedUrl(record.storage_path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/**
 * Salva o PDF do plano: upload no storage + registro permanente em meal_plans.
 * Se vinculado a paciente, também grava no histórico de mídia do prontuário.
 */
export async function saveMealPlanToHistory(opts: {
  tenantId: string;
  professionalId: string;
  patientId?: string | null;
  patientName: string;
  pesoKg?: number | null;
  objetivo?: string | null;
  cid?: string | null;
  planText: string;
  pdfBlob: Blob;
}): Promise<{ planId: string }> {
  const planId = randomUUID();
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(opts.patientName);
  const fileName = `Plano_${slug}_${date}.pdf`;
  const fileSizeKb = Math.round((opts.pdfBlob.size / 1024) * 100) / 100;

  const usePatientBucket = Boolean(opts.patientId);
  const bucket = usePatientBucket ? "patient-documents" : "meal-plans";
  const storagePath = usePatientBucket
    ? `${opts.patientId}/meal-plans/${planId}/${fileName}`
    : `${opts.tenantId}/${planId}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(storagePath, opts.pdfBlob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  let mediaId: string | null = null;
  if (opts.patientId) {
    mediaId = randomUUID();
    const caption = `Plano Terapêutico — ${date.split("-").reverse().join("/")}`;
    const { error: mediaErr } = await supabase.from("patient_media_history" as never).insert({
      id: mediaId,
      tenant_id: opts.tenantId,
      patient_id: opts.patientId,
      professional_id: opts.professionalId,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: "application/pdf",
      file_size_kb: fileSizeKb,
      caption,
    } as never);
    if (mediaErr) throw new Error(mediaErr.message);
  }

  const { error: planErr } = await supabase.from("meal_plans" as never).insert({
    id: planId,
    tenant_id: opts.tenantId,
    professional_id: opts.professionalId,
    patient_id: opts.patientId ?? null,
    patient_name: opts.patientName,
    peso_kg: opts.pesoKg ?? null,
    objetivo: opts.objetivo ?? null,
    cid: opts.cid ?? null,
    plan_text: opts.planText,
    storage_bucket: bucket,
    storage_path: storagePath,
    media_id: mediaId,
  } as never);
  if (planErr) throw new Error(planErr.message);

  return { planId };
}
