import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/feedback-states";
import { StatCard } from "@/components/layout/stat-card";
import { supabase } from "@/integrations/supabase/client";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
} from "@/lib/currency";
import {
  chartMoneyMargin,
  chartMoneyXAxisProps,
  chartMoneyYAxisProps,
  fmtChartMoneyTooltip,
  fmtChartPieLabel,
  roundChartMoney,
} from "@/lib/chart-format";
import { loadProfessionalExpenses, loadTenantExpenses } from "@/lib/expenses";
import { DreStatementView } from "@/components/professional/dre-statement-view";
import { loadDreStatement, type DreStatementData } from "@/lib/dre-statement";
import {
  loadCommissionReport,
  loadCrossReport,
  loadFinancialMetrics,
  loadSalesByPaymentMethod,
  loadSalesByPeriod,
  loadSalesByProfessional,
  loadTopProcedures,
  type CrossReportRow,
  type FinancialMetrics,
  type PaymentMethodRow,
  type PeriodSalesRow,
  type ReportQueryCtx,
  type TopProcedureRow,
} from "@/lib/financial-reports";
import type { ProfessionalProduction } from "@/lib/commission";
import {
  applyReceivableProfessionalFilter,
  RECEIVABLE_BILL_SELECT,
} from "@/lib/financial-scope";
import type { SaleBillRow } from "@/lib/sales";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HandCoins,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

const PAY_COLORS: Record<string, string> = {
  cash: "#22c55e",
  pix: "#14b8a6",
  credit_card: "#3b82f6",
  debit_card: "#6366f1",
  health_insurance: "#a855f7",
  bank_transfer: "#f59e0b",
  other: "#94a3b8",
};

const PRODUCTION_BAR_COLORS: Record<string, string> = {
  Produção: "hsl(var(--primary))",
  Recebido: "hsl(var(--success))",
  Pendente: "hsl(var(--warning))",
};

function ReportHeader({ title, description }: { title: string; description: string }) {
  return (
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );
}

function periodLabel(ctx: ReportQueryCtx) {
  return `${fmtDate(ctx.filters.from)} a ${fmtDate(ctx.filters.to)}`;
}

export function FinancialReportPanels({
  reportId,
  queryCtx,
}: {
  reportId: string;
  queryCtx: ReportQueryCtx;
}) {
  switch (reportId) {
    case "metrics":
      return <MetricsPanel ctx={queryCtx} />;
    case "dre":
      return <DrePanel ctx={queryCtx} />;
    case "dre-detalhado":
      return <DrePanel ctx={queryCtx} defaultTab="detalhado" />;
    case "cruzado":
      return <CrossPanel ctx={queryCtx} />;
    case "comissao":
      return <CommissionReportPanel ctx={queryCtx} />;
    case "vendas-profissional":
      return <SalesByProfessionalPanel ctx={queryCtx} />;
    case "vendas-periodo":
      return <SalesByPeriodPanel ctx={queryCtx} />;
    case "pagamento":
      return <PaymentMethodPanel ctx={queryCtx} />;
    case "top-procedimentos":
      return <TopProceduresPanel ctx={queryCtx} />;
    case "producao":
      return <ProductionPanel ctx={queryCtx} />;
    case "receber":
      return <ReceivablePanel ctx={queryCtx} />;
    case "despesas":
      return <ExpensesPanel ctx={queryCtx} />;
    default:
      return null;
  }
}

function MetricsPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialMetrics | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setData(await loadFinancialMetrics(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={4} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card>
        <ReportHeader
          title="Métricas financeiras"
          description={`${periodLabel(ctx)} · indicadores consolidados do período`}
        />
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Produção" value={fmt(data.production)} icon={Wallet} />
            <StatCard label="Recebido bruto" value={fmt(data.received)} icon={TrendingUp} tone="success" />
            <StatCard label="Recebido líquido" value={fmt(data.netReceived)} icon={HandCoins} tone="success" />
            <StatCard label="Pendente (período)" value={fmt(data.pending)} icon={TrendingDown} tone="warning" />
            <StatCard label="Total em aberto" value={fmt(data.totalOpen)} icon={Receipt} tone="danger" />
            <StatCard label="Taxas" value={fmt(data.fees)} sub="Sobre pagamentos" tone="warning" />
            <StatCard label="Despesas pagas" value={fmt(data.expenses)} tone="danger" />
            <StatCard label="Resultado" value={fmt(data.result)} tone={data.result >= 0 ? "success" : "danger"} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-muted-foreground">Faturas no período</p>
              <p className="text-lg font-semibold">{data.billsInPeriod}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-muted-foreground">Pagamentos registrados</p>
              <p className="text-lg font-semibold">{data.paymentsCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-muted-foreground">Ticket médio</p>
              <p className="text-lg font-semibold">{fmt(data.avgTicket)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DrePanel({
  ctx,
  defaultTab = "resumido",
}: {
  ctx: ReportQueryCtx;
  defaultTab?: "resumido" | "detalhado";
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DreStatementData | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setData(await loadDreStatement(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={8} />;
  if (!data) return null;

  return (
    <DreStatementView data={data} periodLabel={periodLabel(ctx)} defaultTab={defaultTab} />
  );
}

function CrossPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CrossReportRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setRows(await loadCrossReport(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <Card>
      <ReportHeader
        title="Análise cruzada por profissional"
        description={`${periodLabel(ctx)} · produção, recebimentos, despesas e comissão`}
      />
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Produção</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Líquido caixa</TableHead>
              <TableHead className="text-right">Pendente</TableHead>
              <TableHead className="text-right">Despesas</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead className="text-right">Resultado*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Sem dados para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.professionalId}>
                  <TableCell className="font-medium">{r.professionalName}</TableCell>
                  <TableCell className="text-right">{fmt(r.production)}</TableCell>
                  <TableCell className="text-right">{fmt(r.received)}</TableCell>
                  <TableCell className="text-right">{fmt(r.netReceived)}</TableCell>
                  <TableCell className="text-right">{fmt(r.pending)}</TableCell>
                  <TableCell className="text-right">{fmt(r.expenses)}</TableCell>
                  <TableCell className="text-right">
                    {fmt(r.commissionAmount)}
                    <span className="ml-1 text-xs text-muted-foreground">({r.commissionPct}%)</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmt(r.result)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <p className="px-4 pb-4 text-xs text-muted-foreground">
          * Resultado estimado = líquido caixa − despesas − comissão sobre recebido.
        </p>
      </CardContent>
    </Card>
  );
}

export function CommissionReportPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfessionalProduction[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setRows(await loadCommissionReport(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  const totals = useMemo(
    () => ({
      production: rows.reduce((s, r) => s + r.production, 0),
      received: rows.reduce((s, r) => s + r.received, 0),
      commission: rows.reduce((s, r) => s + r.commissionAmount, 0),
    }),
    [rows],
  );

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <Card>
      <ReportHeader
        title="Relatório de comissão"
        description={`${periodLabel(ctx)} · comissão estimada sobre o recebido no período`}
      />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Produção: <strong>{fmt(totals.production)}</strong></span>
          <span>Recebido: <strong>{fmt(totals.received)}</strong></span>
          <span>Comissão total: <strong>{fmt(totals.commission)}</strong></span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Atendimentos</TableHead>
              <TableHead className="text-right">Produção</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Pendente</TableHead>
              <TableHead className="text-right">%</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.filter((r) => r.production > 0 || r.received > 0).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sem comissões no período.
                </TableCell>
              </TableRow>
            ) : (
              rows
                .filter((r) => r.production > 0 || r.received > 0)
                .map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.appointments}</TableCell>
                    <TableCell className="text-right">{fmt(r.production)}</TableCell>
                    <TableCell className="text-right">{fmt(r.received)}</TableCell>
                    <TableCell className="text-right">{fmt(r.pending)}</TableCell>
                    <TableCell className="text-right">{r.commissionPct}%</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.commissionAmount)}</TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SalesByProfessionalPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfessionalProduction[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setRows(await loadSalesByProfessional(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={5} />;

  const chart = rows
    .filter((r) => r.production > 0)
    .slice(0, 12)
    .map((r) => ({
      name: r.name.split(" ")[0],
      fullName: r.name,
      production: roundChartMoney(r.production),
      received: roundChartMoney(r.received),
    }));

  return (
    <div className="space-y-4">
      <Card>
        <ReportHeader title="Vendas por profissional" description={periodLabel(ctx)} />
        <CardContent>
          {chart.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chart} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis {...chartMoneyYAxisProps} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [fmtChartMoneyTooltip(v), name === "production" ? "Produção" : "Recebido"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Legend formatter={(v) => (v === "production" ? "Produção" : "Recebido")} />
                <Bar dataKey="production" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="received" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Produção</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{fmt(r.production)}</TableCell>
                  <TableCell className="text-right">{fmt(r.received)}</TableCell>
                  <TableCell className="text-right">{fmt(r.pending)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesByPeriodPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PeriodSalesRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setRows(await loadSalesByPeriod(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <Card>
        <ReportHeader
          title="Vendas por período"
          description={`${periodLabel(ctx)} · agrupamento ${ctx.filters.periodGranularity === "day" ? "diário" : ctx.filters.periodGranularity === "week" ? "semanal" : "mensal"}`}
        />
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rows} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis {...chartMoneyYAxisProps} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtChartMoneyTooltip(v)} />
                <Legend formatter={(v) => (v === "production" ? "Produção" : "Recebido")} />
                <Line type="monotone" dataKey="production" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="received" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Faturas</TableHead>
                <TableHead className="text-right">Produção</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">{fmt(r.production)}</TableCell>
                  <TableCell className="text-right">{fmt(r.received)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentMethodPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PaymentMethodRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setRows(await loadSalesByPaymentMethod(supabase, ctx));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={4} />;

  const chart = rows.map((r) => ({ name: r.label, value: r.net }));

  return (
    <div className="space-y-4">
      <Card>
        <ReportHeader title="Vendas por forma de pagamento" description={`${periodLabel(ctx)} · valores líquidos`} />
        <CardContent>
          {chart.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Sem pagamentos no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ value }) => fmtChartPieLabel(value)}
                >
                  {chart.map((row, i) => (
                    <Cell key={row.name} fill={Object.values(PAY_COLORS)[i % Object.values(PAY_COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtChartMoneyTooltip(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Taxas</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.method}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right">{fmt(r.gross)}</TableCell>
                  <TableCell className="text-right">{fmt(r.fees)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(r.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TopProceduresPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TopProcedureRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setRows(await loadTopProcedures(supabase, ctx, 10));
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={5} />;

  const chart = rows.map((r) => ({ name: r.name.length > 24 ? `${r.name.slice(0, 24)}…` : r.name, revenue: r.revenue }));

  return (
    <div className="space-y-4">
      <Card>
        <ReportHeader title="Top 10 procedimentos" description={`${periodLabel(ctx)} · por receita de venda`} />
        <CardContent>
          {chart.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Sem procedimentos no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chart} layout="vertical" margin={chartMoneyMargin}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" {...chartMoneyXAxisProps} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmtChartMoneyTooltip(v)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Procedimento</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.name}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductionPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ production: 0, received: 0, pending: 0 });

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const metrics = await loadFinancialMetrics(supabase, ctx);
        setStats({
          production: metrics.production,
          received: metrics.received,
          pending: metrics.pending,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx]);

  if (loading) return <TableSkeleton rows={3} />;

  const chart = [
    { name: "Produção", value: stats.production, fill: PRODUCTION_BAR_COLORS.Produção },
    { name: "Recebido", value: stats.received, fill: PRODUCTION_BAR_COLORS.Recebido },
    { name: "Pendente", value: stats.pending, fill: PRODUCTION_BAR_COLORS.Pendente },
  ];
  const maxValue = Math.max(...chart.map((i) => i.value), 0);

  return (
    <Card>
      <ReportHeader title="Produção por competência" description={periodLabel(ctx)} />
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {chart.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border bg-muted/20 px-4 py-3"
              style={{ borderLeftWidth: 4, borderLeftColor: item.fill }}
            >
              <p className="text-xs text-muted-foreground">{item.name}</p>
              <p className="mt-1 text-lg font-semibold">{fmt(item.value)}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chart} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis {...chartMoneyYAxisProps} domain={[0, maxValue > 0 ? Math.ceil(maxValue * 1.12) : "auto"]} />
            <Tooltip formatter={(v: number) => [fmtChartMoneyTooltip(v), "Valor"]} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={88}>
              {chart.map((item) => (
                <Cell key={item.name} fill={item.fill} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(v: number) => fmtChartPieLabel(v)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ReceivablePanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SaleBillRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      let q = applyReceivableProfessionalFilter(
        supabase
          .from("bills_receivable")
          .select(RECEIVABLE_BILL_SELECT)
          .gte("due_date", ctx.filters.from)
          .lte("due_date", ctx.filters.to)
          .order("due_date"),
        {
          scope: ctx.scope,
          profileId: ctx.profileId,
          professionalFilter: ctx.filters.professionalFilter,
        },
      );
      if (ctx.filters.statusFilter !== "all" && ctx.filters.statusFilter !== "overdue") {
        q = q.eq("status", ctx.filters.statusFilter);
      }
      const { data } = await q;
      let result = (data ?? []) as SaleBillRow[];
      if (ctx.filters.statusFilter === "overdue") {
        result = result.filter((r) => isOverdue(r.due_date, r.status));
      }
      setRows(result);
      setLoading(false);
    })();
  }, [ctx]);

  const totals = useMemo(
    () => ({
      amount: rows.reduce((s, r) => s + Number(r.amount), 0),
      paid: rows.reduce((s, r) => s + Number(r.paid_amount), 0),
      open: rows.reduce((s, r) => s + Math.max(0, Number(r.amount) - Number(r.paid_amount)), 0),
    }),
    [rows],
  );

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <Card>
      <ReportHeader title="Contas a receber" description={`Vencimento entre ${periodLabel(ctx)}`} />
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Total: <strong>{fmt(totals.amount)}</strong></span>
          <span>Recebido: <strong>{fmt(totals.paid)}</strong></span>
          <span>Em aberto: <strong>{fmt(totals.open)}</strong></span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Aberto</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nenhuma cobrança no período.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.profiles?.full_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{r.description}</TableCell>
                    <TableCell>{fmt(r.amount)}</TableCell>
                    <TableCell>{fmt(Number(r.amount) - Number(r.paid_amount))}</TableCell>
                    <TableCell>{fmtDate(r.due_date)}</TableCell>
                    <TableCell>
                      <Badge className={BILL_STATUS_CLASS[eff]}>{BILL_STATUS_LABEL[eff]}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExpensesPanel({ ctx }: { ctx: ReportQueryCtx }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    { id: string; description: string; category: string | null; amount: number; due_date: string; status: string }[]
  >([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const data =
        ctx.scope === "clinic"
          ? await loadTenantExpenses({
              from: ctx.filters.from,
              to: ctx.filters.to,
              status: ctx.filters.statusFilter,
              dateField: "due_date",
              professionalFilter: ctx.filters.professionalFilter,
            })
          : await loadProfessionalExpenses(ctx.profileId, {
              from: ctx.filters.from,
              to: ctx.filters.to,
              status: ctx.filters.statusFilter,
              dateField: "due_date",
            });
      setRows(data);
      setLoading(false);
    })();
  }, [ctx]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows.filter((r) => r.status !== "cancelled")) {
      const k = r.category ?? "Sem categoria";
      map.set(k, (map.get(k) ?? 0) + Number(r.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: roundChartMoney(value) }));
  }, [rows]);

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <Card>
        <ReportHeader title="Despesas por categoria" description={periodLabel(ctx)} />
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-muted-foreground">Sem despesas no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} layout="vertical" margin={chartMoneyMargin}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" {...chartMoneyXAxisProps} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip formatter={(v: number) => fmtChartMoneyTooltip(v)} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{r.category ?? "—"}</TableCell>
                  <TableCell>{fmt(r.amount)}</TableCell>
                  <TableCell>{fmtDate(r.due_date)}</TableCell>
                  <TableCell>{BILL_STATUS_LABEL[r.status] ?? r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
