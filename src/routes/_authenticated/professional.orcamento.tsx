import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useRouter, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Clock,
  FileDown,
  Loader2,
  Plus,
  Receipt,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import { fmtDate } from "@/lib/locale";
import { fmt, parseBRLInput } from "@/lib/currency";
import { randomUUID, cn } from "@/lib/utils";
import { maskCPF } from "@/lib/patient-utils";
import { matchesSearch } from "@/lib/search";
import { loadLetterheadForPdf } from "@/lib/letterhead";
import { generateBudgetPDF } from "@/lib/budget-pdf";
import {
  BUDGET_WELCOME,
  type BudgetChatRecord,
  type CatalogItem,
  type ChatMessage,
  addMedicationToCatalog,
  createFinancialBudget,
  deleteBudgetChat,
  hasBudgetBlock,
  loadBudgetCatalog,
  loadBudgetChats,
  needsCadastro,
  parseBudget,
  purgeExpiredBudgetChats,
  saveBudgetChat,
  saveBudgetPdfToHistory,
  streamBudgetChat,
  stripBudgetMarkers,
} from "@/lib/budget-ai";

export const Route = createFileRoute("/_authenticated/professional/orcamento")({
  validateSearch: (s: Record<string, unknown>) => ({
    patient_id: typeof s.patient_id === "string" ? s.patient_id : undefined,
  }),
  component: OrcamentoPage,
});

interface PatientOption {
  id: string;
  full_name: string;
  cpf: string | null;
}

function renderMarkdown(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function BudgetPreview({ text }: { text: string }) {
  const data = useMemo(() => parseBudget(text), [text]);
  if (!data) return null;
  return (
    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <p className="mb-1 text-sm font-bold text-emerald-900">Orçamento — {data.paciente}</p>
      {data.frase && <p className="mb-2 text-xs italic text-emerald-800">{data.frase}</p>}
      <ul className="space-y-0.5 text-xs text-emerald-900">
        {data.itens.map((it, i) => (
          <li key={i}>
            • {it.desc}
            {it.quantidade > 1 ? ` (${it.quantidade})` : ""} — {fmt(it.preco * it.quantidade)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-semibold text-emerald-900">
        Investimento: {fmt(data.valorFinal)}
      </p>
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  const clean = stripBudgetMarkers(text);
  return (
    <div className="space-y-2">
      {clean && (
        <div
          className="text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(clean) }}
        />
      )}
      {hasBudgetBlock(text) && <BudgetPreview text={text} />}
    </div>
  );
}

function OrcamentoPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const search = useSearch({ from: Route.id });
  const patientIdFromUrl = search.patient_id ?? null;

  const [chatId, setChatId] = useState(() => randomUUID());
  const [patientId, setPatientId] = useState<string | null>(patientIdFromUrl);
  const [patientName, setPatientName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savedBudgetId, setSavedBudgetId] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogContext, setCatalogContext] = useState("");
  const [drafts, setDrafts] = useState<BudgetChatRecord[]>([]);

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  // Cadastro inline de medicamento.
  const [medName, setMedName] = useState("");
  const [medPresentation, setMedPresentation] = useState("");
  const [medPrice, setMedPrice] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Carrega catálogo do sistema (banco de medicamentos) + pacientes.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    void (async () => {
      try {
        const { context, items } = await loadBudgetCatalog(profile.id, profile.tenant_id);
        if (!active) return;
        setCatalog(items);
        setCatalogContext(context);
      } catch (e) {
        console.error(e);
      }
      const { data } = await supabase
        .from("patients")
        .select("id, full_name, cpf")
        .eq("tenant_id", profile.tenant_id)
        .eq("active", true)
        .order("full_name");
      if (active) setPatients((data ?? []) as PatientOption[]);
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  // Paciente vindo do prontuário.
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
      setInput((prev) => prev || `Paciente: ${data.full_name}. Itens: `);
    })();
    return () => {
      active = false;
    };
  }, [patientIdFromUrl]);

  const refreshDrafts = useMemo(
    () => async () => {
      if (!profile) return;
      try {
        await purgeExpiredBudgetChats();
      } catch {
        /* best-effort */
      }
      try {
        setDrafts(await loadBudgetChats(profile.id));
      } catch (e) {
        console.error(e);
      }
    },
    [profile],
  );

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamText]);

  const lastBudgetText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && hasBudgetBlock(m.content)) return m.content;
    }
    return null;
  }, [messages]);

  const lastNeedsCadastro = useMemo(() => {
    const last = messages[messages.length - 1];
    return last?.role === "assistant" && needsCadastro(last.content);
  }, [messages]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 30);
    const digits = q.replace(/\D/g, "");
    return patients
      .filter(
        (p) =>
          matchesSearch(p.full_name, q) ||
          (digits !== "" && (p.cpf ?? "").replace(/\D/g, "").includes(digits)),
      )
      .slice(0, 30);
  }, [patients, patientSearch]);

  const persistDraft = async (msgs: ChatMessage[], budgetId?: string | null) => {
    if (!profile) return;
    const ready = msgs.some((m) => m.role === "assistant" && hasBudgetBlock(m.content));
    const firstUser = msgs.find((m) => m.role === "user");
    const title = patientName || firstUser?.content.slice(0, 60) || "Novo orçamento";
    try {
      await saveBudgetChat({
        id: chatId,
        tenantId: profile.tenant_id,
        professionalId: profile.id,
        patientId,
        budgetId: budgetId ?? savedBudgetId,
        title,
        messages: msgs,
        hasBudget: ready,
      });
      void refreshDrafts();
    } catch (e) {
      console.error(e);
    }
  };

  const runStream = async (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setStreamText("");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const full = await streamBudgetChat(newMessages, catalogContext, {
        signal: controller.signal,
        patientId,
        onToken: (delta) => setStreamText((prev) => prev + delta),
      });
      const finalMessages: ChatMessage[] = [...newMessages, { role: "assistant", content: full }];
      setMessages(finalMessages);
      setStreamText("");
      void persistDraft(finalMessages);
      if (hasBudgetBlock(full)) {
        toast.success("Orçamento pronto! Confira e gere o PDF + lançamento no financeiro.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // cancelado
      } else {
        console.error(e);
        toast.error((e as Error).message || "Erro ao gerar resposta.");
        setMessages(newMessages.slice(0, -1));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const send = async (text?: string) => {
    if (streaming) return;
    const typed = (text ?? input).trim();
    if (!typed) return;
    await runStream([...messages, { role: "user", content: typed }]);
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
    setStreamText("");
    setSavedBudgetId(null);
    if (!patientIdFromUrl) {
      setPatientId(null);
      setPatientName("");
    }
  };

  const resumeDraft = (d: BudgetChatRecord) => {
    stopStreaming();
    setChatId(d.id);
    setMessages(d.messages ?? []);
    setPatientId(d.patient_id);
    setPatientName(d.title);
    setSavedBudgetId(d.budget_id);
    setInput("");
    toast.info("Rascunho retomado.");
  };

  const removeDraft = async (id: string) => {
    try {
      await deleteBudgetChat(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      if (id === chatId) resetChat();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const saveMedication = async () => {
    if (!profile) return;
    if (!medName.trim() || !medPrice.trim()) {
      toast.error("Informe nome e preço de venda.");
      return;
    }
    try {
      const item = await addMedicationToCatalog({
        tenantId: profile.tenant_id,
        professionalId: profile.id,
        name: medName.trim(),
        presentation: medPresentation.trim() || undefined,
        salePrice: parseBRLInput(medPrice),
      });
      setCatalog((prev) => [...prev, item]);
      // recarrega o contexto completo para a IA
      try {
        const { context, items } = await loadBudgetCatalog(profile.id, profile.tenant_id);
        setCatalog(items);
        setCatalogContext(context);
      } catch {
        /* mantém o item adicionado localmente */
      }
      const note = `Medicamento cadastrado: ${item.name}${
        medPresentation.trim() ? ` | ${medPresentation.trim()}` : ""
      } | venda ${fmt(item.price)}. Pode continuar o orçamento.`;
      setMedName("");
      setMedPresentation("");
      setMedPrice("");
      toast.success("Medicamento cadastrado no banco.");
      await send(note);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const generateBudget = async () => {
    if (!profile || !lastBudgetText) return;
    const parsed = parseBudget(lastBudgetText);
    if (!parsed) {
      toast.error("Não foi possível interpretar o orçamento gerado.");
      return;
    }
    if (!patientId) {
      toast.error("Selecione o paciente para lançar o orçamento no financeiro.");
      setPatientOpen(true);
      return;
    }
    setGenerating(true);
    try {
      const letterhead = await loadLetterheadForPdf(profile.id).catch(() => null);
      const blob = generateBudgetPDF({ data: parsed, letterhead });

      const { budgetId, number } = await createFinancialBudget({
        tenantId: profile.tenant_id,
        professionalId: profile.id,
        patientId,
        parsed,
        catalog,
      });
      setSavedBudgetId(budgetId);

      await saveBudgetPdfToHistory({
        tenantId: profile.tenant_id,
        professionalId: profile.id,
        patientId,
        patientName: parsed.paciente || patientName || "Paciente",
        pdfBlob: blob,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orcamento_${(parsed.paciente || "Paciente").replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      void persistDraft(messages, budgetId);
      toast.success(
        `Orçamento${number ? ` #${number}` : ""} lançado no financeiro e PDF salvo no prontuário.`,
      );
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Erro ao gerar o orçamento.");
    } finally {
      setGenerating(false);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/professional/dashboard" });
  };

  return (
    <DashboardShell title="Orçamento">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2">
          <ArrowLeft className="mr-1 size-4" /> Voltar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void router.navigate({ to: "/professional/budgets" })}>
          Ver orçamentos
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Chat */}
        <Card className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <Receipt className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">Assistente de orçamento</p>
                <p className="text-xs text-muted-foreground">
                  {patientName ? `Paciente: ${patientName}` : "Selecione o paciente"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!patientIdFromUrl && (
                <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserIcon className="mr-1 size-4" />
                      {patientName ? "Trocar" : "Paciente"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar nome ou CPF…"
                        value={patientSearch}
                        onValueChange={setPatientSearch}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum paciente</CommandEmpty>
                        <CommandGroup>
                          {filteredPatients.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id}
                              onSelect={() => {
                                setPatientId(p.id);
                                setPatientName(p.full_name);
                                setPatientOpen(false);
                              }}
                            >
                              <div>
                                <div className="font-medium">{p.full_name}</div>
                                {p.cpf && (
                                  <div className="text-xs text-muted-foreground">{maskCPF(p.cpf)}</div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <Button variant="outline" size="sm" onClick={resetChat}>
                <Plus className="mr-1 size-4" /> Novo
              </Button>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Bot className="size-4" />
              </span>
              <div className="rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2">
                <div
                  className="text-sm leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(BUDGET_WELCOME) }}
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
                      isUser ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700",
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
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    ) : (
                      <AssistantBubble text={m.content} />
                    )}
                  </div>
                </div>
              );
            })}

            {streaming && (
              <div className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Bot className="size-4" />
                </span>
                <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-muted/60 px-3 py-2">
                  {streamText ? (
                    <div
                      className="text-sm leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(stripBudgetMarkers(streamText)) }}
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

          {/* Cadastro inline de medicamento */}
          {lastNeedsCadastro && !streaming && (
            <div className="space-y-2 border-t bg-amber-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-amber-900">
                Cadastrar medicamento no banco
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]">
                <Input
                  placeholder="Nome"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="h-9"
                />
                <Input
                  placeholder="Apresentação (opcional)"
                  value={medPresentation}
                  onChange={(e) => setMedPresentation(e.target.value)}
                  className="h-9"
                />
                <Input
                  placeholder="Preço venda"
                  value={medPrice}
                  onChange={(e) => setMedPrice(e.target.value)}
                  className="h-9"
                />
                <Button size="sm" className="h-9" onClick={() => void saveMedication()}>
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Gerar orçamento + PDF */}
          {lastBudgetText && !streaming && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-emerald-50/60 px-4 py-3">
              <p className="text-xs text-emerald-900">
                {patientId
                  ? "Gera o PDF do paciente e lança o orçamento no financeiro."
                  : "Selecione o paciente para lançar no financeiro."}
              </p>
              <Button
                onClick={() => void generateBudget()}
                disabled={generating}
                className="bg-emerald-700 text-white hover:bg-emerald-700/90"
              >
                {generating ? (
                  <Loader2 className="mr-1 size-4 animate-spin" />
                ) : (
                  <FileDown className="mr-1 size-4" />
                )}
                Gerar orçamento + PDF
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 border-t px-3 py-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex.: Paciente Maria Silva — testo 200mg 7un, B12 25mg 2un (Enter = nova linha)"
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

        {/* Rascunhos */}
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
                        {d.has_budget ? "Orçamento pronto · " : ""}
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

          <Card className="p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Como funciona</p>
            Os preços vêm do banco do sistema (serviços/procedimentos e estoque). Ao gerar, o
            orçamento entra no financeiro com status <strong>Orçamento</strong> e pode ser convertido
            em venda na tela de Orçamentos.
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
