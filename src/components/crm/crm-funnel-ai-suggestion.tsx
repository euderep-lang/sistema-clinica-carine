import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createWaDeal, moveWaDealStage, suggestWaDealStage } from "@/lib/whatsapp-crm.functions";

type Suggestion = Awaited<ReturnType<typeof suggestWaDealStage>>;

interface Props {
  conversationId: string;
  dealId?: string | null;
  onUpdated?: () => void;
}

export function CrmFunnelAiSuggestion({ conversationId, dealId, onUpdated }: Props) {
  const suggestFn = useServerFn(suggestWaDealStage);
  const createDealFn = useServerFn(createWaDeal);
  const moveFn = useServerFn(moveWaDealStage);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const result = await suggestFn({ data: { conversationId } });
      setSuggestion(result);
      if (!result.configured) {
        toast.message("IA não configurada", { description: result.reason });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!suggestion?.stageId) return;
    setApplying(true);
    try {
      if (dealId) {
        await moveFn({ data: { dealId, stageId: suggestion.stageId } });
        toast.success(`Movido para ${suggestion.stageName}`);
      } else {
        await createDealFn({
          data: { conversationId, stageId: suggestion.stageId },
        });
        toast.success(`Adicionado ao funil em ${suggestion.stageName}`);
      }
      setSuggestion(null);
      onUpdated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const sameAsCurrent =
    suggestion?.currentStageName &&
    suggestion.stageName &&
    suggestion.currentStageName.trim().toLowerCase() === suggestion.stageName.trim().toLowerCase();

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">Sugestão por IA</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Analisa o texto do chat e sugere a etapa do funil (Fase 1 — sem áudio/foto ainda).
          </p>
        </div>
        <Sparkles className="size-4 shrink-0 text-emerald-600" />
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-full border-emerald-200 bg-background text-xs"
        onClick={() => void analyze()}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 size-3.5 animate-spin" />
            Analisando…
          </>
        ) : (
          "Analisar conversa com IA"
        )}
      </Button>

      {suggestion ? (
        <div className="space-y-2 rounded-md border bg-background p-2.5 text-xs">
          {!suggestion.configured ? (
            <p className="text-muted-foreground">{suggestion.reason}</p>
          ) : suggestion.stageId ? (
            <>
              <p className="font-medium">
                Etapa sugerida: <span className="text-emerald-700">{suggestion.stageName}</span>
                {suggestion.confidence > 0 ? (
                  <span className="text-muted-foreground"> · {suggestion.confidence}%</span>
                ) : null}
              </p>
              <p className="text-muted-foreground leading-relaxed">{suggestion.reason}</p>
              {suggestion.currentStageName ? (
                <p className="text-[10px] text-muted-foreground">
                  Etapa atual: {suggestion.currentStageName}
                </p>
              ) : null}
              {!sameAsCurrent ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full bg-emerald-600 text-xs hover:bg-emerald-700"
                  onClick={() => void apply()}
                  disabled={applying}
                >
                  {applying
                    ? "Aplicando…"
                    : dealId
                      ? `Mover para ${suggestion.stageName}`
                      : `Adicionar ao funil em ${suggestion.stageName}`}
                </Button>
              ) : (
                <p className="text-[11px] text-emerald-700">Já está nesta etapa.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{suggestion.reason}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
