import { useCallback, useEffect, useState } from "react";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWaPipelineConfig, saveWaPipelineConfig } from "@/lib/whatsapp-crm.functions";
import { cn } from "@/lib/utils";

type StageDraft = {
  id?: string;
  name: string;
  color: string;
  win_probability: number;
};

const STAGE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#3b82f6",
  "#f59e0b",
  "#f97316",
  "#22c55e",
  "#10b981",
  "#ef4444",
  "#ec4899",
];

function newStage(sortOrder: number): StageDraft {
  return {
    name: `Nova etapa ${sortOrder + 1}`,
    color: STAGE_COLORS[sortOrder % STAGE_COLORS.length],
    win_probability: Math.min(90, 10 + sortOrder * 10),
  };
}

export function SectionFunilCrm() {
  const configFn = useServerFn(getWaPipelineConfig);
  const saveFn = useServerFn(saveWaPipelineConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pipelineName, setPipelineName] = useState("Funil principal");
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await configFn();
      setPipelineName((data.pipeline as { name?: string } | null)?.name ?? "Funil principal");
      setStages(
        ((data.stages ?? []) as StageDraft[]).map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          win_probability: s.win_probability,
        })),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [configFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setStages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({
        data: {
          pipelineName,
          stages,
        },
      });
      toast.success("Funil salvo");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de vendas (CRM)</CardTitle>
        <CardDescription>
          Edite as etapas do pipeline WhatsApp. Arraste para reordenar. A sugestão por IA usa os nomes
          exatos das etapas — configure OPENAI_API_KEY no .env (local) ou na Vercel (produção).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Nome do funil</Label>
          <Input
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            className="mt-1 max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label>Etapas</Label>
          {stages.map((stage, index) => (
            <div
              key={stage.id ?? `new-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                setDropIndex(index);
              }}
              onDrop={() => {
                if (dragIndex != null) reorder(dragIndex, index);
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3 transition-colors",
                dropIndex === index && dragIndex !== index && "border-primary bg-primary/5",
              )}
            >
              <button
                type="button"
                className="cursor-grab text-muted-foreground active:cursor-grabbing"
                aria-label="Arrastar etapa"
              >
                <GripVertical className="size-4" />
              </button>
              <span className="w-6 text-center text-xs font-semibold text-muted-foreground">{index + 1}</span>
              <Input
                value={stage.name}
                onChange={(e) =>
                  setStages((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)),
                  )
                }
                className="min-w-[140px] flex-1"
                placeholder="Nome da etapa"
              />
              <div className="flex items-center gap-1">
                {STAGE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    className={cn(
                      "size-6 rounded-full border-2 transition",
                      stage.color === color ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setStages((prev) =>
                        prev.map((s, i) => (i === index ? { ...s, color } : s)),
                      )
                    }
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Label className="sr-only">Probabilidade</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={stage.win_probability}
                  onChange={(e) =>
                    setStages((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, win_probability: Number(e.target.value) || 0 } : s,
                      ),
                    )
                  }
                  className="w-16"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={stages.length <= 2}
                onClick={() => setStages((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setStages((prev) => [...prev, newStage(prev.length)])}>
            <Plus className="mr-2 size-4" />
            Adicionar etapa
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar funil"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
