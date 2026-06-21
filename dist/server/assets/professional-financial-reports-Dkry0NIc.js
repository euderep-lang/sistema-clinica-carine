import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from "react";
import { FileSpreadsheet, TrendingUp, CreditCard, Wallet, TrendingDown } from "lucide-react";
import { C as Card, f as CardContent, L as Label, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, u as useAuth, b as CardHeader, e as CardTitle, J as Table, Q as TableBody, N as TableRow, U as TableCell, M as TableHeader, O as TableHead, q as Badge, ai as BILL_STATUS_LABEL, aj as BILL_STATUS_CLASS, af as PAYMENT_LABEL } from "./router-DKQJQoSP.js";
import { T as TableSkeleton } from "./feedback-states-giGuNdjc.js";
import { D as DateRangeFilter } from "./date-range-filter-D23nXrfr.js";
import { Y as firstDayOfMonthISO, t as todayISO, s as supabase, f as fmtDate, d as fmt, i as isOverdue } from "../server.js";
import { c as chartMoneyMargin, a as chartMoneyYAxisProps, f as fmtChartMoneyTooltip, b as chartMoneyXAxisProps } from "./chart-format-g1tKzfTG.js";
import { c as computeCompetencePeriodStats } from "./financial-competence-CrKl4Oe7.js";
import { l as loadProfessionalExpenses } from "./expenses-qnPI0Lnj.js";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts";
import "@tanstack/react-query";
import "@tanstack/react-router";
import "sonner";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "@radix-ui/react-separator";
import "@radix-ui/react-dialog";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "@radix-ui/react-dropdown-menu";
import "./patient-utils-YNqCHR6o.js";
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "node:crypto";
import "@supabase/supabase-js";
const REPORTS = [
  { id: "dre", label: "DRE", icon: FileSpreadsheet },
  { id: "receber", label: "Contas a receber", icon: TrendingUp },
  { id: "pagamento", label: "Formas de pagamento", icon: CreditCard },
  { id: "producao", label: "Produção", icon: Wallet },
  { id: "despesas", label: "Despesas", icon: TrendingDown }
];
const PAY_COLORS = {
  cash: "#22c55e",
  pix: "#14b8a6",
  credit_card: "#3b82f6",
  debit_card: "#6366f1",
  health_insurance: "#a855f7",
  bank_transfer: "#f59e0b",
  other: "#94a3b8"
};
function ProfessionalFinancialReports() {
  const [active, setActive] = useState("dre");
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-[220px_1fr]", children: [
    /* @__PURE__ */ jsx(Card, { className: "h-fit", children: /* @__PURE__ */ jsx(CardContent, { className: "p-2", children: /* @__PURE__ */ jsx("nav", { className: "space-y-1", children: REPORTS.map((r) => /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setActive(r.id),
        className: `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`,
        children: [
          /* @__PURE__ */ jsx(r.icon, { className: "size-4" }),
          r.label
        ]
      },
      r.id
    )) }) }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-wrap items-end gap-4 p-4", children: [
        /* @__PURE__ */ jsx(DateRangeFilter, { from, to, onFromChange: setFrom, onToChange: setTo }),
        (active === "receber" || active === "despesas") && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Situação" }),
          /* @__PURE__ */ jsxs(Select, { value: statusFilter, onValueChange: setStatusFilter, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "pending", children: "Pendente" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "partial", children: "Parcial" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "paid", children: "Paga" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "overdue", children: "Vencida" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "cancelled", children: "Cancelada" })
            ] })
          ] })
        ] })
      ] }) }),
      active === "dre" && /* @__PURE__ */ jsx(DreReport, { from, to }),
      active === "receber" && /* @__PURE__ */ jsx(ReceberReport, { from, to, statusFilter }),
      active === "pagamento" && /* @__PURE__ */ jsx(PagamentoReport, { from, to }),
      active === "producao" && /* @__PURE__ */ jsx(ProducaoReport, { from, to }),
      active === "despesas" && /* @__PURE__ */ jsx(DespesasReport, { from, to, statusFilter })
    ] })
  ] });
}
function DreReport({ from, to }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    production: 0,
    received: 0,
    fees: 0,
    netReceived: 0,
    expenses: 0,
    result: 0
  });
  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const [{ data: bills }, { data: payments }, expenses] = await Promise.all([
        supabase.from("bills_receivable").select(
          "id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id"
        ).eq("professional_id", profile.id),
        supabase.from("bill_payments").select("amount, fee_amount, net_amount, paid_date, status").eq("professional_id", profile.id).eq("status", "active").gte("paid_date", from).lte("paid_date", to),
        loadProfessionalExpenses(profile.id, {
          from,
          to,
          dateField: "paid_date",
          status: "paid"
        })
      ]);
      const period = { from, to };
      const stats = computeCompetencePeriodStats(bills ?? [], period);
      const payRows = payments ?? [];
      const fees = payRows.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
      const netReceived = payRows.reduce(
        (s, p) => s + Number(p.net_amount ?? p.amount),
        0
      );
      const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
      setData({
        production: stats.production,
        received: stats.received,
        fees,
        netReceived: netReceived || stats.received - fees,
        expenses: expenseTotal,
        result: (netReceived || stats.received - fees) - expenseTotal
      });
      setLoading(false);
    })();
  }, [profile, from, to]);
  if (loading) return /* @__PURE__ */ jsx(TableSkeleton, { rows: 5 });
  const lines = [
    { label: "Produção (competência)", value: data.production, tone: "default" },
    { label: "Recebido bruto", value: data.received, tone: "success" },
    { label: "Taxas de pagamento", value: -data.fees, tone: "warning" },
    { label: "Recebido líquido", value: data.netReceived, tone: "success" },
    { label: "Despesas pagas", value: -data.expenses, tone: "danger" },
    { label: "Resultado", value: data.result, tone: "primary" }
  ];
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base", children: [
      "DRE — ",
      fmtDate(from),
      " a ",
      fmtDate(to)
    ] }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(Table, { children: /* @__PURE__ */ jsx(TableBody, { children: lines.map((line) => /* @__PURE__ */ jsxs(TableRow, { children: [
      /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: line.label }),
      /* @__PURE__ */ jsx(TableCell, { className: "text-right font-semibold", children: fmt(line.value) })
    ] }, line.label)) }) }) })
  ] });
}
function ReceberReport({
  from,
  to,
  statusFilter
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from("bills_receivable").select(
      "id, description, amount, paid_amount, due_date, status, patients(full_name), installment_number, installment_count"
    ).eq("professional_id", profile.id).gte("due_date", from).lte("due_date", to).order("due_date");
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setRows(data ?? []);
    setLoading(false);
  }, [profile, from, to, statusFilter]);
  useEffect(() => {
    void load();
  }, [load]);
  const totals = useMemo(
    () => ({
      amount: rows.reduce((s, r) => s + Number(r.amount), 0),
      paid: rows.reduce((s, r) => s + Number(r.paid_amount), 0),
      open: rows.reduce((s, r) => s + Math.max(0, Number(r.amount) - Number(r.paid_amount)), 0)
    }),
    [rows]
  );
  if (loading) return /* @__PURE__ */ jsx(TableSkeleton, { rows: 6 });
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Contas a receber" }) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 text-sm", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "Total: ",
          /* @__PURE__ */ jsx("strong", { children: fmt(totals.amount) })
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Recebido: ",
          /* @__PURE__ */ jsx("strong", { children: fmt(totals.paid) })
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Em aberto: ",
          /* @__PURE__ */ jsx("strong", { children: fmt(totals.open) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Aberto" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-8 text-center text-muted-foreground", children: "Nenhuma cobrança no período." }) }) : rows.map((r) => {
          const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: r.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { className: "max-w-[200px] truncate text-sm", children: r.description }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(r.amount) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(Number(r.amount) - Number(r.paid_amount)) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.due_date) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[eff], children: BILL_STATUS_LABEL[eff] }) })
          ] }, r.id);
        }) })
      ] })
    ] })
  ] });
}
function PagamentoReport({ from, to }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chart, setChart] = useState([]);
  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase.from("bill_payments").select("payment_method, amount, net_amount").eq("professional_id", profile.id).eq("status", "active").gte("paid_date", from).lte("paid_date", to);
      const map = /* @__PURE__ */ new Map();
      for (const row of data ?? []) {
        const k = row.payment_method;
        map.set(k, (map.get(k) ?? 0) + Number(row.net_amount ?? row.amount));
      }
      setChart(
        Array.from(map.entries()).map(([k, value]) => ({
          name: PAYMENT_LABEL[k] ?? k,
          value
        }))
      );
      setLoading(false);
    })();
  }, [profile, from, to]);
  if (loading) return /* @__PURE__ */ jsx(TableSkeleton, { rows: 4 });
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Receita por forma de pagamento (líquido)" }) }),
    /* @__PURE__ */ jsx(CardContent, { children: chart.length === 0 ? /* @__PURE__ */ jsx("p", { className: "py-8 text-center text-muted-foreground", children: "Sem pagamentos no período." }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 280, children: /* @__PURE__ */ jsxs(PieChart, { children: [
      /* @__PURE__ */ jsx(Pie, { data: chart, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", outerRadius: 90, label: true, children: chart.map((_, i) => /* @__PURE__ */ jsx(Cell, { fill: Object.values(PAY_COLORS)[i % Object.values(PAY_COLORS).length] }, i)) }),
      /* @__PURE__ */ jsx(Tooltip, { formatter: (v) => fmt(v) }),
      /* @__PURE__ */ jsx(Legend, {})
    ] }) }) })
  ] });
}
function ProducaoReport({ from, to }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ production: 0, received: 0, pending: 0 });
  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase.from("bills_receivable").select(
        "id, amount, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id"
      ).eq("professional_id", profile.id);
      setStats(computeCompetencePeriodStats(data ?? [], { from, to }));
      setLoading(false);
    })();
  }, [profile, from, to]);
  if (loading) return /* @__PURE__ */ jsx(TableSkeleton, { rows: 3 });
  const chart = [
    { name: "Produção", value: stats.production },
    { name: "Recebido", value: stats.received },
    { name: "Pendente", value: stats.pending }
  ];
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Produção por competência" }) }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxs(BarChart, { data: chart, margin: chartMoneyMargin, children: [
      /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
      /* @__PURE__ */ jsx(XAxis, { dataKey: "name" }),
      /* @__PURE__ */ jsx(YAxis, { ...chartMoneyYAxisProps }),
      /* @__PURE__ */ jsx(Tooltip, { formatter: (v) => fmtChartMoneyTooltip(v) }),
      /* @__PURE__ */ jsx(Bar, { dataKey: "value", fill: "hsl(var(--primary))", radius: [4, 4, 0, 0] })
    ] }) }) })
  ] });
}
function DespesasReport({
  from,
  to,
  statusFilter
}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (!profile) return;
    void (async () => {
      setLoading(true);
      const data = await loadProfessionalExpenses(profile.id, {
        from,
        to,
        status: statusFilter,
        dateField: "due_date"
      });
      setRows(data);
      setLoading(false);
    })();
  }, [profile, from, to, statusFilter]);
  const byCategory = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const r of rows.filter((r2) => r2.status !== "cancelled")) {
      const k = r.category ?? "Sem categoria";
      map.set(k, (map.get(k) ?? 0) + Number(r.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows]);
  if (loading) return /* @__PURE__ */ jsx(TableSkeleton, { rows: 5 });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Despesas por categoria" }) }),
      /* @__PURE__ */ jsx(CardContent, { children: byCategory.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Sem despesas no período." }) : /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 220, children: /* @__PURE__ */ jsxs(BarChart, { data: byCategory, layout: "vertical", margin: chartMoneyMargin, children: [
        /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
        /* @__PURE__ */ jsx(XAxis, { type: "number", ...chartMoneyXAxisProps }),
        /* @__PURE__ */ jsx(YAxis, { type: "category", dataKey: "name", width: 100 }),
        /* @__PURE__ */ jsx(Tooltip, { formatter: (v) => fmtChartMoneyTooltip(v) }),
        /* @__PURE__ */ jsx(Bar, { dataKey: "value", fill: "#ef4444", radius: [0, 4, 4, 0] })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Categoria" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: rows.map((r) => /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableCell, { children: r.description }),
        /* @__PURE__ */ jsx(TableCell, { children: r.category ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { children: fmt(r.amount) }),
        /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.due_date) }),
        /* @__PURE__ */ jsx(TableCell, { children: BILL_STATUS_LABEL[r.status] ?? r.status })
      ] }, r.id)) })
    ] }) }) })
  ] });
}
export {
  ProfessionalFinancialReports
};
