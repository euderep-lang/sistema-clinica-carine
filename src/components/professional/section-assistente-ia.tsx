import { useEffect, useState } from "react";
import { Bot, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";

const BUDGET_PLACEHOLDER = `Exemplos do que você pode ensinar a IA:

• Tom de voz ao falar com o paciente (acolhedor, objetivo, etc.)
• Regras de desconto (PIX 7%, parcelamento até 10x sem juros)
• Como montar o texto do orçamento e os benefícios esperados
• Normalizações de nomes (testo = testosterona, tirsepatida = tirzepatida)
• O que sempre incluir ou evitar nos orçamentos`;

const MEAL_PLAN_PLACEHOLDER = `Exemplos do que você pode ensinar a IA:

• Protocolo padrão de suplementação (whey, creatina, doses)
• Abordagem por condição (lipedema, menopausa, pós-operatório)
• Preferências alimentares e restrições que você costuma aplicar
• Formato e nível de detalhe das refeições
• Regras para refeição livre e frequência`;

export function SectionAssistenteIa() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetInstructions, setBudgetInstructions] = useState("");
  const [mealPlanInstructions, setMealPlanInstructions] = useState("");

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("ai_budget_instructions, ai_meal_plan_instructions")
        .eq("id", profile.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      else if (data) {
        const row = data as {
          ai_budget_instructions?: string | null;
          ai_meal_plan_instructions?: string | null;
        };
        setBudgetInstructions(row.ai_budget_instructions ?? "");
        setMealPlanInstructions(row.ai_meal_plan_instructions ?? "");
      }
      setLoading(false);
    })();
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ai_budget_instructions: budgetInstructions.trim() || null,
          ai_meal_plan_instructions: mealPlanInstructions.trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      toast.success("Instruções da IA salvas");
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  const hasCustom =
    budgetInstructions.trim().length > 0 || mealPlanInstructions.trim().length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" />
            Assistente com IA
          </CardTitle>
          <CardDescription>
            Ensine a IA como montar orçamentos e planos terapêuticos. Ela consulta automaticamente
            procedimentos, estoque, pacientes, formas de pagamento e histórico do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>Orçamento (IA) — preços, texto para o paciente e lançamento financeiro</li>
            <li>Plano terapêutico — bioimpedância, refeições e PDF</li>
          </ul>
          {hasCustom && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
              Instruções personalizadas ativas
              {budgetInstructions.trim() ? " · Orçamentos" : ""}
              {mealPlanInstructions.trim() ? " · Plano terapêutico" : ""}
            </p>
          )}
          <Button type="button" onClick={() => setDialogOpen(true)}>
            Configurar treinamento da IA
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Treinar assistente de IA</DialogTitle>
            <DialogDescription>
              Descreva como a IA deve se comportar. Essas instruções têm prioridade sobre o
              comportamento padrão. A IA acessa o catálogo, pacientes e histórico do sistema em
              tempo real a cada conversa.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="budget" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
              <TabsTrigger value="budget">Orçamentos</TabsTrigger>
              <TabsTrigger value="meal">Plano terapêutico</TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <TabsContent value="budget" className="mt-0 space-y-2">
                <Label htmlFor="ai-budget">Instruções para orçamentos</Label>
                <Textarea
                  id="ai-budget"
                  value={budgetInstructions}
                  onChange={(e) => setBudgetInstructions(e.target.value)}
                  placeholder={BUDGET_PLACEHOLDER}
                  rows={14}
                  className="min-h-[280px] resize-y font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="meal" className="mt-0 space-y-2">
                <Label htmlFor="ai-meal">Instruções para plano terapêutico</Label>
                <Textarea
                  id="ai-meal"
                  value={mealPlanInstructions}
                  onChange={(e) => setMealPlanInstructions(e.target.value)}
                  placeholder={MEAL_PLAN_PLACEHOLDER}
                  rows={14}
                  className="min-h-[280px] resize-y font-mono text-sm"
                />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Salvar instruções
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
