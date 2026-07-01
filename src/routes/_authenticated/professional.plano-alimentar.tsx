import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Clock,
  Download,
  FileDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Salad,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmtDate } from "@/lib/locale";
import { randomUUID, cn } from "@/lib/utils";
import { generateMealPlanPDF } from "@/lib/meal-plan-pdf";
import {
  MEAL_PLAN_WELCOME,
  type ChatMessage,
  type ChatPart,
  type MealPlanChatRecord,
  type MealPlanRecord,
  deleteMealPlanChat,
  extractTextFromPdf,
  fileToDataUrl,
  getMealPlanUrl,
  hasPlanBlock,
  loadMealPlanChats,
  loadMealPlans,
  messageHasImage,
  messageText,
  parsePlano,
  purgeExpiredChats,
  saveMealPlanChat,
  saveMealPlanToHistory,
  streamMealPlanChat,
} from "@/lib/meal-plan";

export const Route = createFileRoute("/_authenticated/professional/plano-alimentar")({
  validateSearch: (s: Record<string, unknown>) => ({
    patient_id: typeof s.patient_id === "string" ? s.patient_id : undefined,
  }),
  component: PlanoAlimentarPage,
});

const BIO_MARKER = "\n\n---\nDADOS DE BIOIMPEDÂNCIA:\n";

interface Attachment {
  id: string;
  name: string;
  kind: "pdf" | "image";
  dataUrl?: string;
  extractedText?: string;
  extracting?: boolean;
}

/** Texto exibível: remove o bloco de bioimpedância (que vai oculto para a IA). */
function displayText(content: string | ChatPart[]): string {
  const t = messageText(content);
  const idx = t.indexOf("---\nDADOS DE BIOIMPEDÂNCIA:");
  return (idx >= 0 ? t.slice(0, idx) : t).trim();
}

/** Renderização leve de markdown (negrito + quebras de linha). */
function renderMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

function PlanPreview({ text }: { text: string }) {
  const plan = useMemo(() => parsePlano(text), [text]);
  if (!plan) return null;
  const renderMeals = (meals: typeof plan.colunaEsquerda) =>
    meals.map((m, i) => (
      <div key={i} className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{m.nome}</p>
        <ul className="space-y-0.5 text-xs text-emerald-900">
          {m.itens.map((it, j) => (
            <li key={j}>
              • {it.texto}
              {it.quantidade ? ` (${it.quantidade})` : ""}
            </li>
          ))}
        </ul>
      </div>
    ));
  return (
    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="mb-2 text-sm font-bold text-emerald-900">
        Plano terapêutico — {plan.paciente}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">{renderMeals(plan.colunaEsquerda)}</div>
        <div className="space-y-2">{renderMeals(plan.colunaDireita)}</div>
      </div>
      {plan.refeicaoLivre.length > 0 && (
        <div className="mt-2 border-t border-emerald-200 pt-2">
          <p className="text-xs font-semibold text-emerald-800">Refeição livre</p>
          <ul className="text-xs text-emerald-900">
            {plan.refeicaoLivre.map((o, i) => (
              <li key={i}>
                {i + 1}) {o}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  if (!hasPlanBlock(text)) {
    return (
      <div
        className="prose-sm max-w-none text-sm leading-relaxed text-foreground"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
      />
    );
  }
  const before = text.slice(0, text.indexOf("[INICIO_PLANO]")).trim();
  const after = text.slice(text.indexOf("[FIM_PLANO]") + "[FIM_PLANO]".length).trim();
  return (
    <div className="space-y-2">
      {before && (
        <div
          className="text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(before) }}
        />
      )}
      <PlanPreview text={text} />
      {after && <p className="text-sm font-medium italic text-emerald-700">{after}</p>}
    </div>
  );
}

function PlanoAlimentarPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const search = useSearch({ from: Route.id });
  const patientIdFromUrl = search.patient_id ?? null;

  const [chatId, setChatId] = useState(() => randomUUID());
  const [patientId, setPatientId] = useState<string | null>(patientIdFromUrl);
  const [patientName, setPatientName] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [cid, setCid] = useState("");
  const [generating, setGenerating] = useState(false);

  const [plans, setPlans] = useState<MealPlanRecord[]>([]);
  const [drafts, setDrafts] = useState<MealPlanChatRecord[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Carrega dados do paciente vindo do prontuário.
  useEffect(() => {
    if (!patientIdFromUrl) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, full_name")
        .eq("id", patientIdFromUrl)
        .maybeSingle();
      if (!active || !data) return;
      setPatientId(data.id);
      setPatientName(data.full_name);
      setInput((prev) =>
        prev ? prev : `Paciente: ${data.full_name}\nResumo clínico: `,
      );
    })();
    return () => {
      active = false;
    };
  }, [patientIdFromUrl]);

  const refreshLists = useMemo(
    () => async () => {
      if (!profile) return;
      try {
        await purgeExpiredChats();
      } catch {
        /* best-effort */
      }
      try {
        const [p, d] = await Promise.all([
          loadMealPlans(profile.id, patientIdFromUrl),
          loadMealPlanChats(profile.id),
        ]);
        setPlans(p);
        setDrafts(d);
      } catch (e) {
        console.error(e);
      }
    },
    [profile, patientIdFromUrl],
  );

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamText]);

  const lastPlanText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") {
        const t = messageText(m.content);
        if (hasPlanBlock(t)) return t;
      }
    }
    return null;
  }, [messages]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const id = randomUUID();
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        setAttachments((prev) => [
          ...prev,
          { id, name: file.name, kind: "pdf", extracting: true },
        ]);
        try {
          const text = await extractTextFromPdf(file);
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, extractedText: text, extracting: false } : a)),
          );
        } catch (e) {
          console.error(e);
          toast.error(`Não foi possível ler o PDF ${file.name}.`);
          setAttachments((prev) => prev.filter((a) => a.id !== id));
        }
      } else if (file.type.startsWith("image/")) {
        try {
          const dataUrl = await fileToDataUrl(file);
          setAttachments((prev) => [...prev, { id, name: file.name, kind: "image", dataUrl }]);
        } catch {
          toast.error(`Não foi possível ler a imagem ${file.name}.`);
        }
      } else {
        toast.error("Anexe apenas PDF ou imagem.");
      }
    }
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const persistDraft = async (msgs: ChatMessage[]) => {
    if (!profile) return;
    const planReady = msgs.some(
      (m) => m.role === "assistant" && hasPlanBlock(messageText(m.content)),
    );
    const firstUser = msgs.find((m) => m.role === "user");
    const title =
      patientName || (firstUser ? displayText(firstUser.content).slice(0, 60) : "") || "Novo plano";
    try {
      await saveMealPlanChat({
        id: chatId,
        tenantId: profile.tenant_id,
        professionalId: profile.id,
        patientId,
        title,
        messages: msgs,
        hasPlan: planReady,
      });
      void refreshLists();
    } catch (e) {
      console.error(e);
    }
  };

  const send = async () => {
    if (streaming) return;
    const typed = input.trim();
    const ready = attachments.filter((a) => !a.extracting);
    if (!typed && ready.length === 0) return;
    if (attachments.some((a) => a.extracting)) {
      toast.info("Aguarde a leitura do anexo terminar.");
      return;
    }

    const pdfText = ready
      .filter((a) => a.kind === "pdf" && a.extractedText)
      .map((a) => a.extractedText!.trim())
      .join("\n\n");
    const images = ready.filter((a) => a.kind === "image" && a.dataUrl);

    let textForApi = typed;
    if (pdfText) textForApi += `${BIO_MARKER}${pdfText}`;

    let content: string | ChatPart[];
    if (images.length > 0) {
      const parts: ChatPart[] = [
        { type: "text", text: textForApi || "Segue a bioimpedância em imagem para análise." },
      ];
      for (const img of images) parts.push({ type: "image_url", image_url: { url: img.dataUrl! } });
      content = parts;
    } else {
      content = textForApi;
    }

    const newMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setAttachments([]);
    setStreaming(true);
    setStreamText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const full = await streamMealPlanChat(newMessages, {
        signal: controller.signal,
        patientId,
        onToken: (delta) => setStreamText((prev) => prev + delta),
      });
      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: "assistant", content: full },
      ];
      setMessages(finalMessages);
      setStreamText("");
      void persistDraft(finalMessages);
      if (hasPlanBlock(full)) {
        toast.success("Plano gerado! Informe o CID e gere o PDF para salvar no histórico.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // cancelado pelo usuário
      } else {
        console.error(e);
        toast.error((e as Error).message || "Erro ao gerar resposta.");
        setMessages(messages);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setStreamText("");
  };

  const resetChat = () => {
    stopStreaming();
    setChatId(randomUUID());
    setMessages([]);
    setInput("");
    setAttachments([]);
    setCid("");
    setStreamText("");
    if (!patientIdFromUrl) {
      setPatientId(null);
      setPatientName("");
    }
  };

  const resumeDraft = (d: MealPlanChatRecord) => {
    stopStreaming();
    setChatId(d.id);
    setMessages(d.messages ?? []);
    setPatientId(d.patient_id);
    setPatientName(d.title);
    setInput("");
    setAttachments([]);
    setCid("");
    toast.info("Rascunho retomado.");
  };

  const removeDraft = async (id: string) => {
    try {
      await deleteMealPlanChat(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (id === chatId) resetChat();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const generatePdf = async () => {
    if (!profile || !lastPlanText) return;
    if (!cid.trim()) {
      toast.error("Informe o CID antes de gerar o PDF.");
      return;
    }
    const plan = parsePlano(lastPlanText);
    if (!plan) {
      toast.error("Não foi possível interpretar o plano. Verifique o conteúdo gerado.");
      return;
    }
    setGenerating(true);
    try {
      const blob = generateMealPlanPDF(plan, { cid: cid.trim() });
      await saveMealPlanToHistory({
        tenantId: profile.tenant_id,
        professionalId: profile.id,
        patientId,
        patientName: plan.paciente || patientName || "Paciente",
        pesoKg: plan.pesoKg || null,
        objetivo: plan.objetivo || null,
        cid: cid.trim().toUpperCase(),
        planText: lastPlanText,
        pdfBlob: blob,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Plano_${(plan.paciente || "Paciente").replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        patientId ? "Plano salvo no histórico do prontuário." : "Plano salvo e PDF baixado.",
      );
      void persistDraft(messages);
      void refreshLists();
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Erro ao gerar o PDF.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadExisting = async (record: MealPlanRecord) => {
    try {
      const url = await getMealPlanUrl(record);
      window.open(url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/professional/dashboard" });
  };

  return (
    <DashboardShell title="Plano Terapêutico">
      <div className="mb-3">
        <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2">
          <ArrowLeft className="mr-1 size-4" /> Voltar
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Coluna do chat */}
        <Card className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-lime-100 text-lime-700">
                <Salad className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Assistente nutricional</p>
                <p className="text-xs text-muted-foreground">
                  {patientName ? `Paciente: ${patientName}` : "Sem paciente vinculado"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetChat}>
              <Plus className="mr-1 size-4" /> Novo
            </Button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-lime-100 text-lime-700">
                <Bot className="size-4" />
              </span>
              <div className="rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2">
                <div
                  className="text-sm leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(MEAL_PLAN_WELCOME) }}
                />
              </div>
            </div>

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={cn("flex gap-3", isUser && "flex-row-reverse")}>
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                      isUser ? "bg-primary/10 text-primary" : "bg-lime-100 text-lime-700",
                    )}
                  >
                    {isUser ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2",
                      isUser
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm bg-muted/60",
                    )}
                  >
                    {isUser ? (
                      <div className="space-y-1">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {displayText(m.content) || "(anexo)"}
                        </p>
                        {messageHasImage(m.content) && (
                          <span className="inline-flex items-center gap-1 text-xs opacity-80">
                            <ImageIcon className="size-3" /> imagem anexada
                          </span>
                        )}
                      </div>
                    ) : (
                      <AssistantBubble text={messageText(m.content)} />
                    )}
                  </div>
                </div>
              );
            })}

            {streaming && (
              <div className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-lime-100 text-lime-700">
                  <Bot className="size-4" />
                </span>
                <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2">
                  {streamText ? (
                    <div
                      className="text-sm leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(streamText) }}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> pensando…
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Geração de PDF */}
          {lastPlanText && !streaming && (
            <div className="flex flex-wrap items-end gap-2 border-t bg-emerald-50/60 px-4 py-3">
              <div className="grid gap-1">
                <Label htmlFor="cid" className="text-xs">
                  CID (obrigatório)
                </Label>
                <Input
                  id="cid"
                  value={cid}
                  onChange={(e) => setCid(e.target.value.toUpperCase())}
                  placeholder="Ex.: E66.0"
                  className="h-9 w-36"
                />
              </div>
              <Button
                onClick={() => void generatePdf()}
                disabled={generating}
                className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              >
                {generating ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-1 size-4" />
                )}
                Gerar e salvar PDF
              </Button>
            </div>
          )}

          {/* Anexos pendentes */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t px-4 py-2">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs"
                >
                  {a.kind === "pdf" ? (
                    <FileText className="size-3" />
                  ) : (
                    <ImageIcon className="size-3" />
                  )}
                  <span className="max-w-[140px] truncate">{a.name}</span>
                  {a.extracting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <button type="button" onClick={() => removeAttachment(a.id)}>
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 border-t px-3 py-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => fileRef.current?.click()}
              title="Anexar PDF ou imagem da bioimpedância"
            >
              <Paperclip className="size-4" />
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite aqui (Enter = nova linha). Anexe a bioimpedância pelo clipe."
              rows={1}
              className="max-h-24 min-h-10 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }}
            />
            {streaming ? (
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0"
                onClick={stopStreaming}
                title="Parar"
              >
                <X className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-10 shrink-0"
                onClick={() => void send()}
                title="Enviar"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Coluna lateral: rascunhos + planos salvos */}
        <div className="space-y-4">
          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="size-4 text-amber-600" /> Rascunhos (72h)
            </p>
            {drafts.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum rascunho recente.</p>
            ) : (
              <ul className="space-y-1.5">
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                      d.id === chatId && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => resumeDraft(d)}
                    >
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {d.has_plan ? "Plano pronto · " : ""}
                        {fmtDate(d.updated_at.slice(0, 10))}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDraft(d.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Excluir rascunho"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Download className="size-4 text-emerald-600" /> Planos salvos
            </p>
            {plans.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum plano gerado ainda.</p>
            ) : (
              <ul className="space-y-1.5">
                {plans.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void downloadExisting(p)}
                    >
                      <span className="block truncate font-medium">{p.patient_name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDate(p.created_at.slice(0, 10))}
                        {p.cid ? ` · ${p.cid}` : ""}
                      </span>
                    </button>
                    <FileDown className="size-3.5 shrink-0 text-emerald-600" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
