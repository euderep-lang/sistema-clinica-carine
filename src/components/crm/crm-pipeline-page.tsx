import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/lib/locale";
import {
  ensureWaPipeline,
  getWaPipelineBoard,
  moveWaDealStage,
} from "@/lib/whatsapp-crm.functions";
import { conversationDisplayName } from "@/lib/whatsapp-crm";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const ensureFn = useServerFn(ensureWaPipeline);
  const boardFn = useServerFn(getWaPipelineBoard);
  const moveFn = useServerFn(moveWaDealStage);
  const [loading, setLoading] = useState(true);
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

  const moveDeal = async (dealId: string, stageId: string) => {
    try {
      await moveFn({ data: { dealId, stageId } });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={pipelineName ?? "Funil de vendas"}
        description="Pipeline estilo Kommo — arraste negócios entre etapas ou use os botões."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/crm/inbox">
              <ArrowLeft className="mr-1.5 size-4" />
              Inbox
            </Link>
          </Button>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage, idx) => {
          const stageDeals = dealsByStage.get(stage.id) ?? [];
          const prevStage = stages[idx - 1];
          const nextStage = stages[idx + 1];

          return (
            <div key={stage.id} className="flex w-[min(100%,280px)] shrink-0 flex-col">
              <div className="mb-2 flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <h3 className="text-sm font-semibold">{stage.name}</h3>
                <span className="text-xs text-muted-foreground">({stageDeals.length})</span>
              </div>
              <div className="flex min-h-[420px] flex-col gap-2 rounded-xl border bg-muted/20 p-2">
                {stageDeals.map((deal) => (
                  <Card key={deal.id} className="p-3 shadow-sm">
                    <p className="text-sm font-medium">{deal.title}</p>
                    {deal.wa_conversations ? (
                      <p className="text-xs text-muted-foreground">
                        {conversationDisplayName(deal.wa_conversations)}
                      </p>
                    ) : null}
                    {deal.value_cents > 0 ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        {fmt(deal.value_cents / 100)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {prevStage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => void moveDeal(deal.id, prevStage.id)}
                        >
                          ←
                        </Button>
                      ) : null}
                      {nextStage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          onClick={() => void moveDeal(deal.id, nextStage.id)}
                        >
                          →
                        </Button>
                      ) : null}
                      {deal.conversation_id ? (
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
                          <Link to="/crm/inbox" search={{ conversation: deal.conversation_id }}>
                            Chat
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </Card>
                ))}
                {stageDeals.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">Vazio</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <p className={cn("text-xs text-muted-foreground")}>
        Para criar negócio a partir de uma conversa, use o botão &quot;Adicionar ao funil&quot; no painel do inbox.
      </p>
    </DashboardShell>
  );
}
