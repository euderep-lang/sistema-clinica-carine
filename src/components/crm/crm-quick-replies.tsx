import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  deleteWaQuickReply,
  getWaQuickReplies,
  seedFollowUpQuickReplies,
  seedWaQuickReplies,
  upsertWaQuickReply,
} from "@/lib/whatsapp-crm.functions";
import { renderTemplate, TEMPLATE_VARS } from "@/lib/settings-helpers";
import {
  fetchWaQuickRepliesCached,
  getCachedWaQuickReplies,
  invalidateWaQuickRepliesCache,
  markWaQuickRepliesSeeded,
  shouldRunWaQuickRepliesBackgroundSeed,
  type WaQuickReplyRow,
} from "@/lib/wa-quick-replies-cache";
import { QUICK_REPLY_CATEGORY_LABELS } from "@/lib/whatsapp-crm";
import { useAuth } from "@/lib/mock-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CUSTOM_CATEGORY = "personalizadas";

interface Props {
  onSelect: (text: string) => void;
  disabled?: boolean;
  templateVars?: Record<string, string>;
}

export function CrmQuickReplies({ onSelect, disabled, templateVars }: Props) {
  const { tenant } = useAuth();
  const repliesFn = useServerFn(getWaQuickReplies);
  const seedFn = useServerFn(seedWaQuickReplies);
  const seedFollowUpFn = useServerFn(seedFollowUpQuickReplies);
  const upsertFn = useServerFn(upsertWaQuickReply);
  const deleteFn = useServerFn(deleteWaQuickReply);

  const [replies, setReplies] = useState<WaQuickReplyRow[]>(() =>
    tenant?.id ? (getCachedWaQuickReplies(tenant.id) ?? []) : [],
  );
  const [loading, setLoading] = useState(() => !replies.length);
  const [category, setCategory] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReplies = useCallback(async () => {
    if (!tenant?.id) return;
    const rows = await fetchWaQuickRepliesCached(tenant.id, async () => {
      const data = await repliesFn();
      return data as WaQuickReplyRow[];
    });
    setReplies(rows);
    setLoading(false);
    return rows;
  }, [repliesFn, tenant?.id]);

  useEffect(() => {
    if (!tenant?.id) return;

    const cached = getCachedWaQuickReplies(tenant.id);
    if (cached?.length) {
      setReplies(cached);
      setLoading(false);
    }

    let cancelled = false;
    void loadReplies().then(() => {
      if (cancelled) return;
    });

    if (shouldRunWaQuickRepliesBackgroundSeed()) {
      markWaQuickRepliesSeeded();
      void seedFn()
        .catch(() => {})
        .then(() => invalidateWaQuickRepliesCache());
      void seedFollowUpFn()
        .catch(() => {})
        .then(() => {
          invalidateWaQuickRepliesCache();
          if (!cancelled) void loadReplies();
        });
    }

    return () => {
      cancelled = true;
    };
  }, [loadReplies, seedFn, seedFollowUpFn, tenant?.id]);

  const categories = useMemo(() => {
    const set = new Set(replies.map((r) => r.category ?? "geral"));
    set.delete(CUSTOM_CATEGORY);
    return ["all", ...Array.from(set).sort(), CUSTOM_CATEGORY];
  }, [replies]);

  const customReplies = useMemo(
    () => replies.filter((r) => (r.category ?? "geral") === CUSTOM_CATEGORY),
    [replies],
  );

  const filtered = useMemo(() => {
    if (category === "all") return replies.filter((r) => (r.category ?? "geral") !== CUSTOM_CATEGORY);
    if (category === CUSTOM_CATEGORY) return customReplies;
    return replies.filter((r) => (r.category ?? "geral") === category);
  }, [replies, category, customReplies]);

  const vars = useMemo(
    () => ({
      nome_clinica: tenant?.name ?? "Sua Clínica",
      nome_paciente: "Paciente",
      primeiro_nome: "Paciente",
      data_consulta: "—",
      hora_consulta: "—",
      nome_profissional: "equipe médica",
      ...templateVars,
    }),
    [tenant?.name, templateVars],
  );

  const applyReply = useCallback(
    (content: string) => {
      onSelect(renderTemplate(content, vars));
    },
    [onSelect, vars],
  );

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormContent("");
    setFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormName("");
    setFormContent("");
    setFormOpen(true);
  };

  const openEditForm = (reply: WaQuickReplyRow) => {
    setEditingId(reply.id);
    setFormName(reply.name);
    setFormContent(reply.content);
    setFormOpen(true);
  };

  const saveCustom = async () => {
    if (!formName.trim() || !formContent.trim()) {
      toast.error("Preencha o nome e a mensagem.");
      return;
    }
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: editingId ?? undefined,
          name: formName.trim(),
          content: formContent.trim(),
          category: CUSTOM_CATEGORY,
        },
      });
      toast.success(editingId ? "Mensagem atualizada" : "Mensagem criada");
      resetForm();
      invalidateWaQuickRepliesCache();
      await loadReplies();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const removeCustom = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      toast.success("Mensagem removida");
      if (editingId === id) resetForm();
      invalidateWaQuickRepliesCache();
      await loadReplies();
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível remover");
    }
  };

  const isCustomTab = category === CUSTOM_CATEGORY;

  if (loading && replies.length === 0) {
    return (
      <div className="mb-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Carregando respostas…
      </div>
    );
  }

  if (replies.length === 0 && !isCustomTab) {
    return (
      <div className="mb-2">
        <button
          type="button"
          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          onClick={() => setCategory(CUSTOM_CATEGORY)}
        >
          Personalizadas
        </button>
      </div>
    );
  }

  return (
    <div className="mb-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] transition",
              category === c
                ? c === CUSTOM_CATEGORY
                  ? "bg-violet-600 text-white"
                  : "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            onClick={() => {
              setCategory(c);
              if (c !== CUSTOM_CATEGORY) resetForm();
            }}
          >
            {QUICK_REPLY_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
        </div>
        <span
          className="hidden shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex"
          title="Use o botão ✨ no campo de mensagem para reformular com IA antes de enviar"
        >
          <Sparkles className="size-3 text-emerald-600" />
          IA manual
        </span>
      </div>

      {isCustomTab ? (
        <div className="max-h-[min(36dvh,280px)] overflow-y-auto overscroll-contain rounded-xl border border-violet-200/80 bg-violet-50/40 p-2.5 dark:border-violet-900/40 dark:bg-violet-950/20 [-webkit-overflow-scrolling:touch]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-violet-900 dark:text-violet-200">
              Suas mensagens personalizadas
            </p>
            {!formOpen ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-full border-violet-300 text-[11px] text-violet-800"
                onClick={openCreateForm}
              >
                <Plus className="size-3" />
                Nova
              </Button>
            ) : (
              <Button type="button" size="icon" variant="ghost" className="size-7" onClick={resetForm}>
                <X className="size-3.5" />
              </Button>
            )}
          </div>

          {formOpen ? (
            <div className="space-y-2 rounded-lg border border-violet-200/60 bg-background/80 p-2.5">
              <Input
                placeholder="Nome curto (ex.: Boas-vindas VIP)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-8 text-xs"
              />
              <Textarea
                placeholder="Digite a mensagem… Use {{primeiro_nome}}, {{data_consulta}}, {{hora_consulta}}"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={3}
                className="min-h-[72px] resize-none text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Variáveis: {TEMPLATE_VARS.map((v) => `{{${v}}}`).join(", ")}
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 w-full rounded-full bg-violet-600 text-xs hover:bg-violet-700"
                disabled={saving}
                onClick={() => void saveCustom()}
              >
                {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                {editingId ? "Salvar alterações" : "Criar mensagem"}
              </Button>
            </div>
          ) : null}

          {customReplies.length === 0 && !formOpen ? (
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              Nenhuma mensagem personalizada ainda. Clique em Nova para criar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customReplies.map((r) => (
                <div key={r.id} className="group relative flex items-center">
                  <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                      "shrink-0 rounded-full border border-violet-200/80 bg-white/90 px-3 py-1 pr-7 text-[11px] font-medium text-violet-900",
                      "transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50",
                      "dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100",
                    )}
                    onClick={() => applyReply(r.content)}
                  >
                    {r.name}
                  </button>
                  <div className="absolute right-0.5 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-violet-600 hover:bg-violet-100"
                      title="Editar"
                      onClick={() => openEditForm(r)}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-red-600 hover:bg-red-50"
                      title="Excluir"
                      onClick={() => void removeCustom(r.id)}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              title={r.shortcut ? `Atalho: ${r.shortcut}` : r.name}
              className={cn(
                "shrink-0 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-[11px] font-medium text-emerald-900",
                "transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50",
                "dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
              )}
              onClick={() => applyReply(r.content)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
