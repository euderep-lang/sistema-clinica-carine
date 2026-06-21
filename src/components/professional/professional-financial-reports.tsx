import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/feedback-states";
import { DateRangeFilter, firstDayOfMonth, todayISO } from "@/components/professional/date-range-filter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-auth";
import {
  BILL_STATUS_CLASS,
  BILL_STATUS_LABEL,
  fmt,
  fmtDate,
  isOverdue,
  PAYMENT_LABEL,
} from "@/lib/currency";
import {
  chartMoneyMargin,
  chartMoneyXAxisProps,
  chartMoneyYAxisProps,
  fmtChartMoneyTooltip,
} from "@/lib/chart-format";
import { computeCompetencePeriodStats } from "@/lib/financial-competence";
import { loadProfessionalExpenses } from "@/lib/expenses";
import type { SaleBillRow } from "@/lib/sales";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const REPORTS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "dre", label: "DRE", icon: FileSpreadsheet },
  { id: "receber", label: "Contas a receber", icon: TrendingUp },
  { id: "pagamento", label: "Formas de pagamento", icon: CreditCard },
  { id: "producao", label: "Produção", icon: Wallet },
  { id: "despesas", label: "Despesas", icon: TrendingDown },
];

const PAY_COLORS: Record<string, string> = {
  cash: "#22c55e",
  pix: "#14b8a6",
  credit_card: "#3b82f6",
  debit_card: "#6366f1",
  health_insurance: "#a855f7",
  bank_transfer: "#f59e0b",
  other: "#94a3b8",
};

export function ProfessionalFinancialReports() {
  const [active, setActive] = useState("dre");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit">
        <CardContent className="p-2">
          <nav className="space-y-1">
            {REPORTS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActive(r.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                  active === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <r.icon className="size-4" />
                {r.label}
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 p-4">
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            {(active === "receber" || active === "despesas") && (
              <div>
                <Label className="text-xs">Situação</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {active === "dre" && <DreReport from={from} to={to} />}
        {active === "receber" && (
          <ReceberReport from={from} to={to} statusFilter={statusFilter} />
        )}
        {active === "pagamento" && <PagamentoReport from={from} to={to} />}
        {active === "producao" && <ProducaoReport from={from} to={to} />}
        {active === "despesas" && (
          <DespesasReport from={from} to={to} statusFilter={statusFilter} />
        )}
      </div>
    </div>
  );
}

function DreReport({ from, to }: { from: string; to: string }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    production: 0,
    received: 0,
    fees: 0,
    netReceived: 0,
    expenses: 0,
    result: 0,
  });

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const [{ data: bills }, { data: payments }, expenses] = await Promise.all([
        supabase
          .from("bills_receivable")
          .select(
            "id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id",
          )
          .eq("professional_id", profile.id),
        supabase
          .from("bill_payments" as never)
          .select("amount, fee_amount, net_amount, paid_date, status")
          .eq("professional_id", profile.id)
          .eq("status", "active")
          .gte("paid_date", from)
          .lte("paid_date", to),
        loadProfessionalExpenses(profile.id, {
          from,
          to,
          dateField: "paid_date",
          status: "paid",
        }),
      ]);

      const period = { from, to };
      const stats = computeCompetencePeriodStats((bills ?? []) as SaleBillRow[], period);
      const payRows = (payments ?? []) as {
        amount: number;
        fee_amount: number | null;
        net_amount: number | null;
      }[];
      const fees = payRows.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
      const netReceived = payRows.reduce(
        (s, p) => s + Number(p.net_amount ?? p.amount),
        0,
      );
      const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

      setData({
        production: stats.production,
        received: stats.received,
        fees,
        netReceived: netReceived || stats.received - fees,
        expenses: expenseTotal,
        result: (netReceived || stats.received - fees) - expenseTotal,
      });
      setLoading(false);
    })();
  }, [profile, from, to]);

  if (loading) return <TableSkeleton rows={5} />;

  const lines = [
    { label: "Produção (competência)", value: data.production, tone: "default" },
    { label: "Recebido bruto", value: data.received, tone: "success" },
    { label: "Taxas de pagamento", value: -data.fees, tone: "warning" },
    { label: "Recebido líquido", value: data.netReceived, tone: "success" },
    { label: "Despesas pagas", value: -data.expenses, tone: "danger" },
    { label: "Resultado", value: data.result, tone: "primary" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">DRE — {fmtDate(from)} a {fmtDate(to)}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.label}>
                <TableCell className="font-medium">{line.label}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(line.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReceberReport({
  from,
  to,
  statusFilter,
}: {
  from: string;
  to: string;
  statusFilter: string;
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SaleBillRow[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase
      .from("bills_receivable")
      .select(
        "id, description, amount, paid_amount, due_date, status, patients(full_name), installment_number, installment_count",
      )
      .eq("professional_id", profile.id)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date");
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setRows((data ?? []) as SaleBillRow[]);
    setLoading(false);
  }, [profile, from, to, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

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
      <CardHeader>
        <CardTitle className="text-base">Contas a receber</CardTitle>
      </CardHeader>
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
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhuma cobrança no período.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.patients?.full_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{r.description}</TableCell>
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

function PagamentoReport({ from, to }: { from: string; to: string }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bill_payments" as never)
        .select("payment_method, amount, net_amount")
        .eq("professional_id", profile.id)
        .eq("status", "active")
        .gte("paid_date", from)
        .lte("paid_date", to);
      const map = new Map<string, number>();
      for (const row of (data ?? []) as { payment_method: string; net_amount: number | null; amount: number }[]) {
        const k = row.payment_method;
        map.set(k, (map.get(k) ?? 0) + Number(row.net_amount ?? row.amount));
      }
      setChart(
        Array.from(map.entries()).map(([k, value]) => ({
          name: PAYMENT_LABEL[k] ?? k,
          value,
        })),
      );
      setLoading(false);
    })();
  }, [profile, from, to]);

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receita por forma de pagamento (líquido)</CardTitle>
      </CardHeader>
      <CardContent>
        {chart.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Sem pagamentos no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={chart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {chart.map((_, i) => (
                  <Cell key={i} fill={Object.values(PAY_COLORS)[i % Object.values(PAY_COLORS).length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ProducaoReport({ from, to }: { from: string; to: string }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ production: 0, received: 0, pending: 0 });

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bills_receivable")
        .select(
          "id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id",
        )
        .eq("professional_id", profile.id);
      setStats(computeCompetencePeriodStats((data ?? []) as SaleBillRow[], { from, to }));
      setLoading(false);
    })();
  }, [profile, from, to]);

  if (loading) return <TableSkeleton rows={3} />;

  const chart = [
    { name: "Produção", value: stats.production },
    { name: "Recebido", value: stats.received },
    { name: "Pendente", value: stats.pending },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Produção por competência</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart} margin={chartMoneyMargin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis {...chartMoneyYAxisProps} />
            <Tooltip formatter={(v: number) => fmtChartMoneyTooltip(v)} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DespesasReport({
  from,
  to,
  statusFilter,
}: {
  from: string;
  to: string;
  statusFilter: string;
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    { id: string; description: string; category: string | null; amount: number; due_date: string; status: string }[]
  >([]);

  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const data = await loadProfessionalExpenses(profile.id, {
        from,
        to,
        status: statusFilter,
        dateField: "due_date",
      });
      setRows(data);
      setLoading(false);
    })();
  }, [profile, from, to, statusFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows.filter((r) => r.status !== "cancelled")) {
      const k = r.category ?? "Sem categoria";
      map.set(k, (map.get(k) ?? 0) + Number(r.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Despesas por categoria</CardTitle>
        </CardHeader>
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
        <CardContent className="p-0">
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
