import { useMemo } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt } from "@/lib/currency";
import {
  buildDreDetailedLines,
  buildDreSummaryLines,
  type DreDisplayLine,
  type DreStatementData,
} from "@/lib/dre-statement";
import { cn } from "@/lib/utils";

function formatDreAmount(line: DreDisplayLine): string {
  if (line.amount == null) return "";
  const value = line.deduct ? -Math.abs(line.amount) : line.amount;
  return fmt(value);
}

function DreAmountCell({ line }: { line: DreDisplayLine }) {
  if (line.amount == null) return <span className="text-muted-foreground">—</span>;
  const value = line.deduct ? -Math.abs(line.amount) : line.amount;
  return (
    <span
      className={cn(
        "tabular-nums",
        line.highlight || line.kind === "total" ? "text-base font-bold" : "font-medium",
        line.kind === "total" && value >= 0 && "text-emerald-700 dark:text-emerald-400",
        line.kind === "total" && value < 0 && "text-destructive",
        line.deduct && value < 0 && line.kind !== "total" && "text-destructive/90",
      )}
    >
      {formatDreAmount(line)}
    </span>
  );
}

function DreSummaryCards({ data }: { data: DreStatementData }) {
  const cards = [
    {
      label: "Receita líquida",
      value: data.netRevenue,
      sub: "Produção − descontos (competência)",
      icon: TrendingUp,
      tone: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Despesas pagas",
      value: data.operationalExpenses,
      sub: "Contas pagas no período (data pagamento)",
      icon: Minus,
      tone: "text-red-700 dark:text-red-400 bg-red-500/10",
    },
    {
      label: "Comissões + taxas",
      value: data.commissions + data.financialExpenses,
      sub: `${fmt(data.commissions)} comissões · ${fmt(data.financialExpenses)} taxas`,
      icon: Minus,
      tone: "text-amber-700 dark:text-amber-400 bg-amber-500/10",
    },
    {
      label: "Resultado operacional",
      value: data.operatingResult,
      sub: "Receita líquida − despesas − comissões − taxas",
      icon: data.operatingResult >= 0 ? TrendingUp : TrendingDown,
      tone:
        data.operatingResult >= 0
          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
          : "text-destructive bg-destructive/10",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums">{fmt(card.value)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
            </div>
            <div className={cn("rounded-lg p-2", card.tone)}>
              <card.icon className="size-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DreTable({ lines, detailed }: { lines: DreDisplayLine[]; detailed?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[4rem_1fr_9rem]">
        {detailed ? <span className="hidden sm:block">Código</span> : null}
        <span className={detailed ? "sm:col-start-2" : ""}>Descrição</span>
        <span className="text-right">Valor (R$)</span>
      </div>
      <div className="divide-y">
        {lines.map((line) => {
          if (line.kind === "section") {
            return (
              <div
                key={line.id}
                className="border-t-2 border-primary/20 bg-primary/5 px-4 py-3 first:border-t-0"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {line.code}. {line.label}
                </p>
              </div>
            );
          }

          if (line.kind === "group") {
            return (
              <div key={line.id} className="bg-muted/20 px-4 py-2">
                <p className="text-sm font-semibold text-foreground">{line.label}</p>
              </div>
            );
          }

          const padding = line.indent * 16 + (detailed ? 0 : 8);

          return (
            <div
              key={line.id}
              className={cn(
                "grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2.5 sm:grid-cols-[4rem_1fr_9rem]",
                line.kind === "subtotal" && "bg-muted/30 font-semibold",
                line.kind === "total" && "border-t-2 border-foreground/10 bg-muted/50 py-4",
              )}
            >
              {detailed ? (
                <span className="hidden font-mono text-xs text-muted-foreground sm:block">{line.code}</span>
              ) : null}
              <p
                className={cn(
                  "text-sm",
                  detailed ? "sm:col-start-2" : "",
                  line.kind === "total" && "text-base font-bold",
                  line.kind === "subtotal" && "font-semibold",
                  line.indent >= 2 && "text-muted-foreground",
                )}
                style={{ paddingLeft: padding }}
              >
                {detailed && line.indent >= 2 ? "↳ " : null}
                {line.label}
              </p>
              <div className="text-right">
                <DreAmountCell line={line} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DreStatementView({
  data,
  periodLabel,
  defaultTab = "resumido",
}: {
  data: DreStatementData;
  periodLabel: string;
  defaultTab?: "resumido" | "detalhado";
}) {
  const summaryLines = useMemo(() => buildDreSummaryLines(data), [data]);
  const detailedLines = useMemo(() => buildDreDetailedLines(data), [data]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/15">
        <CardHeader className="border-b bg-gradient-to-br from-primary/5 via-background to-background pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg">Demonstração do Resultado do Exercício</CardTitle>
              <CardDescription className="mt-1">
                Período: <strong className="text-foreground">{periodLabel}</strong>
                {" · "}
                Regime de competência para receitas · Caixa como anexo informativo
              </CardDescription>
            </div>
            <Badge variant="outline" className="shrink-0">
              {data.operatingResult >= 0 ? "Resultado positivo" : "Resultado negativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <DreSummaryCards data={data} />

          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="resumido">DRE resumido</TabsTrigger>
              <TabsTrigger value="detalhado">DRE detalhado</TabsTrigger>
            </TabsList>
            <TabsContent value="resumido" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Visão sintética com as principais linhas do demonstrativo.
              </p>
              <DreTable lines={summaryLines} />
            </TabsContent>
            <TabsContent value="detalhado" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Detalhamento da receita por profissional, despesas por categoria, comissões,
                taxas por forma de pagamento e anexo de caixa.
              </p>
              <DreTable lines={detailedLines} detailed />
            </TabsContent>
          </Tabs>

          <p className="text-xs leading-relaxed text-muted-foreground">
            * Receita reconhecida por competência (produção). Despesas operacionais consideram a data
            em que a conta foi paga — igual ao card &quot;Despesas pagas&quot; e ao caixa. Comissões
            calculadas sobre valores recebidos no período. Taxas deduzidas dos recebimentos. O anexo de
            caixa não compõe o resultado contábil, apenas concilia o fluxo de recebimentos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
