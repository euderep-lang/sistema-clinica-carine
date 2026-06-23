import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, GripVertical, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/locale";
import {
  ensureWaPipeline,
  getWaPipelineBoard,
  moveWaDealStage,
} from "@/lib/whatsapp-crm.functions";
import { conversationDisplayName } from "@/lib/whatsapp-crm";
import { CrmPageShell } from "@/components/crm/crm-pwa-shell";
import { useCrmPwaMode } from "@/components/crm/use-crm-pwa-mode";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/mock-auth";

type Stage = { id: string; name: string; color: string; sort_order: number; win_probability: number };
type Deal = {
  id: string;
  title: string;
  value_cents: number;
  stage_id: string;
  conversation_id: string | null;
  updated_at: string;
  wa_conversations?: { contact_name: string | null; contact_phone: string; channel?: string } | null;
};

export function CrmPipelinePage() {
  const { profile } = useAuth();
  const pwaMode = useCrmPwaMode();
  const ensureFn = useServerFn(ensureWaPipeline);
  const boardFn = useServerFn(getWaPipelineBoard);
  const moveFn = useServerFn(moveWaDealStage);
  const [loading, setLoading] = useState(true);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [dragDealId, setDragDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureFn();
      const board = await boardFn();
      setPipelineName((board.pipeline as { name?: string } | null)?.name ?? "Funil");
      setStages((board.stages ?? []) as Stage[]);
      setDeals((board.deals ?? []) as Deal[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardFn, ensureFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const s of stages) map.set(s.id, []);
    for (const d of deals) {
      const list = map.get(d.stage_id) ?? [];
      list.push(d);
      map.set(d.stage_id, list);
    }
    return map;
  }, [stages, deals]);

  const moveDeal = async (dealId: string, stageId: string, optimistic = true) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === stageId) return;

    if (optimistic) {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: stageId } : d)));
    }

    setMovingDealId(dealId);
    try {
      const result = await moveFn({ data: { dealId, stageId } });
      if (result.status === "won" || result.status === "lost") {
        setDeals((prev) => prev.filter((d) => d.id !== dealId));
        toast.success(result.status === "won" ? "Negócio ganho!" : "Negócio marcado como perdido");
      }
    } catch (e) {
      toast.error((e as Error).message);
      await load();
    } finally {
      setMovingDealId(null);
    }
  };

  const onDropDeal = (stageId: string) => {
    if (!dragDealId) return;
    void moveDeal(dragDealId, stageId);
    setDragDealId(null);
    setDragOverStageId(null);
  };

  if (loading) {
    return (
      <CrmPageShell
        title="Funil"
        pwa={pwaMode ? { activeTab: "pipeline", header: { title: "Funil de vendas" } } : undefined}
      >
        <div className="flex h-full min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </CrmPageShell>
    );
  }

  return (
    <CrmPageShell
      title="Funil"
      pwa={
        pwaMode
          ? { activeTab: "pipeline", header: { title: pipelineName ?? "Funil de vendas" } }
          : undefined
      }
    >
      {!pwaMode ? (
      <PageHeader
        title={pipelineName ?? "Funil de vendas"}
        description="Arraste os cards entre as colunas para avançar o atendimento."
        actions={
          <div className="flex flex-wrap gap-2">
            {profile?.role === "admin" ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/settings" search={{ section: "funil" }}>
                  <Settings className="mr-1.5 size-4" />
                  Editar etapas
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/inbox">
                <ArrowLeft className="mr-1.5 size-4" />
                Inbox
              </Link>
            </Button>
          </div>
        }
      />
      ) : null}

      <div className={cn("flex gap-3 overflow-x-auto pb-4", pwaMode && "p-2 pt-3")}>
        {stages.map((stage) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const isDropTarget = dragOverStageId === stage.id && dragDealId != null;

          return (
            <div key={stage.id} className="flex w-[min(100%,280px)] shrink-0 flex-col">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <h3 className="text-sm font-semibold">{stage.name}</h3>
                <span className="text-xs text-muted-foreground">({stageDeals.length})</span>
              </div>
              <div
                className={cn(
                  "flex min-h-[420px] flex-col gap-2 rounded-xl border bg-muted/20 p-2 transition-colors",
                  isDropTarget && "border-primary bg-primary/5 ring-2 ring-primary/20",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStageId(stage.id);
                }}
                onDragLeave={() => {
                  if (dragOverStageId === stage.id) setDragOverStageId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropDeal(stage.id);
                }}
              >
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragDealId(deal.id)}
                    onDragEnd={() => {
                      setDragDealId(null);
                      setDragOverStageId(null);
                    }}
                    className={cn(
                      "cursor-grab p-3 shadow-sm active:cursor-grabbing",
                      movingDealId === deal.id && "opacity-60",
                      dragDealId === deal.id && "ring-2 ring-primary/30",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{deal.title}</p>
                        {deal.wa_conversations ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {conversationDisplayName(deal.wa_conversations)}
                          </p>
                        ) : null}
                        {deal.value_cents > 0 ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            {fmt(deal.value_cents / 100)}
                          </p>
                        ) : null}
                        {deal.conversation_id ? (
                          <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-[10px]" asChild>
                            <Link to="/crm/inbox" search={{ conversation: deal.conversation_id }}>
                              Abrir chat
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
                {stageDeals.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {isDropTarget ? "Solte aqui" : "Vazio"}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className={cn("text-xs text-muted-foreground", pwaMode && "px-2 pb-2")}>
        Adicione contatos pelo CRM WhatsApp → aba Paciente → &quot;Adicionar ao funil&quot;.
        {profile?.role === "admin" ? " Configure etapas em Configurações → Funil de vendas." : null}
      </p>
    </CrmPageShell>
  );
}
