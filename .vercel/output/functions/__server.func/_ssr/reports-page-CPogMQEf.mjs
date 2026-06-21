import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { s as supabase, d as fmt, f as fmtDate, O as shiftDateISO, t as todayISO, X as fmtDateShortWeekday, Y as firstDayOfMonthISO, e as addMonthsISO } from "./index.mjs";
import { C as Card, f as CardContent, u as useAuth, b as CardHeader, e as CardTitle, B as Button, af as PAYMENT_LABEL, V as APPOINTMENT_STATUS_LABEL, F as APPOINTMENT_TYPE_LABEL, q as Badge, L as Label, I as Input, ag as resolveLetterheadProfessionalId } from "./router-DcWaovdP.mjs";
import { c as chartMoneyMargin, a as chartMoneyYAxisProps, f as fmtChartMoneyTooltip } from "./chart-format-DfEPv4w3.mjs";
import { p as printWithLetterhead } from "./letterhead-print-DT3ksJ63.mjs";
import { T as TableSkeleton, E as EmptyState } from "./feedback-states-BIDvoE5J.mjs";
import { i as Users, n as CreditCard, u as Stethoscope, af as CalendarRange, ag as BanknoteArrowDown, ah as UserPlus, D as Download } from "../_libs/lucide-react.mjs";
import { R as ResponsiveContainer, B as BarChart, C as CartesianGrid, X as XAxis, Y as YAxis, T as Tooltip, a as Bar, P as PieChart, b as Pie, c as Cell, L as Legend } from "../_libs/recharts.mjs";
const REPORTS = [
  { id: "producao", label: "Produção por Profissional", icon: Users },
  { id: "pagamento", label: "Receita por Forma de Pagamento", icon: CreditCard },
  { id: "especialidade", label: "Consultas por Especialidade", icon: Stethoscope },
  { id: "agenda", label: "Relatório de Agenda", icon: CalendarRange },
  { id: "fluxo", label: "Fluxo de Caixa Detalhado", icon: BanknoteArrowDown },
  { id: "pacientes", label: "Relatório de Pacientes", icon: UserPlus }
];
function firstDayOfMonth() {
  return firstDayOfMonthISO();
}
function today() {
  return todayISO();
}
function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
function ReportsPage() {
  const [active, setActive] = reactExports.useState("producao");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-6 lg:grid-cols-[240px_1fr]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "h-fit", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "space-y-1", children: REPORTS.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setActive(r.id), className: `w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left ${active === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(r.icon, { className: "size-4" }),
      r.label
    ] }, r.id)) }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      active === "producao" && /* @__PURE__ */ jsxRuntimeExports.jsx(ProducaoReport, {}),
      active === "pagamento" && /* @__PURE__ */ jsxRuntimeExports.jsx(PagamentoReport, {}),
      active === "especialidade" && /* @__PURE__ */ jsxRuntimeExports.jsx(EspecialidadeReport, {}),
      active === "agenda" && /* @__PURE__ */ jsxRuntimeExports.jsx(AgendaReport, {}),
      active === "fluxo" && /* @__PURE__ */ jsxRuntimeExports.jsx(FluxoReport, {}),
      active === "pacientes" && /* @__PURE__ */ jsxRuntimeExports.jsx(PacientesReport, {})
    ] })
  ] });
}
function DateRange({ from, to, setFrom, setTo }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-end", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "De" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: from, onChange: (e) => setFrom(e.target.value), className: "w-40" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-xs", children: "Até" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: to, onChange: (e) => setTo(e.target.value), className: "w-40" })
    ] })
  ] });
}
function ProducaoReport() {
  const { tenant } = useAuth();
  const [from, setFrom] = reactExports.useState(firstDayOfMonth());
  const [to, setTo] = reactExports.useState(today());
  const [loading, setLoading] = reactExports.useState(true);
  const [rows, setRows] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, commission_pct").eq("role", "professional");
      const { data: bills } = await supabase.from("bills_receivable").select("professional_id, amount, paid_amount, status").gte("due_date", from).lte("due_date", to);
      const { data: appts } = await supabase.from("appointments").select("professional_id, status").eq("status", "completed").gte("date", from).lte("date", to);
      const map = /* @__PURE__ */ new Map();
      (profs ?? []).forEach((p) => map.set(p.id, { id: p.id, name: p.full_name, commission: Number(p.commission_pct ?? 0), appointments: 0, total: 0, received: 0, pending: 0 }));
      (bills ?? []).forEach((b) => {
        if (!b.professional_id) return;
        const m = map.get(b.professional_id);
        if (!m) return;
        m.total += Number(b.amount);
        m.received += Number(b.paid_amount);
        if (b.status === "pending" || b.status === "partial") m.pending += Number(b.amount) - Number(b.paid_amount);
      });
      (appts ?? []).forEach((a) => {
        if (a.professional_id) {
          const m = map.get(a.professional_id);
          if (m) m.appointments++;
        }
      });
      setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [from, to]);
  const totals = rows.reduce((acc, r) => ({ a: acc.a + r.appointments, t: acc.t + r.total, rec: acc.rec + r.received, p: acc.p + r.pending, c: acc.c + r.received * (r.commission / 100) }), { a: 0, t: 0, rec: 0, p: 0, c: 0 });
  const primary = tenant?.primary_color ?? "#1a2b4a";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Produção por Profissional" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DateRange, { from, to, setFrom, setTo })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, {}) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Users, title: "Sem produção no período" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: 280, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: rows, margin: chartMoneyMargin, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "name", fontSize: 11, angle: -15, textAnchor: "end", height: 60 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { fontSize: 11, ...chartMoneyYAxisProps }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (v) => fmtChartMoneyTooltip(v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "total", fill: primary, name: "Produção" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2", children: "Profissional" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Consultas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produção" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Recebido" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Pendente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Comissão" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.appointments }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(r.total) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(r.received) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-amber-600", children: fmt(r.pending) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              fmt(r.received * (r.commission / 100)),
              " (",
              r.commission,
              "%)"
            ] })
          ] }, r.id)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t font-semibold bg-muted/50", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: "Total" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: totals.a }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(totals.t) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(totals.rec) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(totals.p) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(totals.c) })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => downloadCSV("producao.csv", [["Profissional", "Consultas", "Producao", "Recebido", "Pendente", "Comissao"], ...rows.map((r) => [r.name, r.appointments, r.total, r.received, r.pending, r.received * (r.commission / 100)])]), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4 mr-2" }),
        "Exportar planilha"
      ] })
    ] }) })
  ] });
}
const PAY_COLORS = { cash: "#22c55e", pix: "#14b8a6", credit_card: "#3b82f6", debit_card: "#6366f1", health_insurance: "#a855f7", bank_transfer: "#f59e0b", other: "#94a3b8" };
function PagamentoReport() {
  const [from, setFrom] = reactExports.useState(firstDayOfMonth());
  const [to, setTo] = reactExports.useState(today());
  const [loading, setLoading] = reactExports.useState(true);
  const [rows, setRows] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("bills_receivable").select("payment_method, paid_amount, status").eq("status", "paid").gte("paid_date", from).lte("paid_date", to);
      const map = /* @__PURE__ */ new Map();
      (data ?? []).forEach((b) => {
        const k = b.payment_method ?? "other";
        const m = map.get(k) ?? { method: k, count: 0, total: 0 };
        m.count++;
        m.total += Number(b.paid_amount);
        map.set(k, m);
      });
      setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [from, to]);
  const grand = rows.reduce((s, r) => s + r.total, 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Receita por Forma de Pagamento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DateRange, { from, to, setFrom, setTo })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, {}) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: CreditCard, title: "Sem pagamentos no período" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: 280, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Pie, { data: rows, dataKey: "total", nameKey: "method", cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 100, label: (e) => PAYMENT_LABEL[e.method], children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: PAY_COLORS[r.method] ?? "#94a3b8" }, r.method)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (v) => fmt(v) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, { formatter: (v) => PAYMENT_LABEL[v] ?? v })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2", children: "Forma" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Quantidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "%" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: PAYMENT_LABEL[r.method] ?? r.method }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.count }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(r.total) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
            (r.total / grand * 100).toFixed(1),
            "%"
          ] })
        ] }, r.method)) })
      ] })
    ] }) })
  ] });
}
function EspecialidadeReport() {
  const [from, setFrom] = reactExports.useState(firstDayOfMonth());
  const [to, setTo] = reactExports.useState(today());
  const [loading, setLoading] = reactExports.useState(true);
  const [rows, setRows] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("appointments").select("specialty, status").gte("date", from).lte("date", to);
      const map = /* @__PURE__ */ new Map();
      (data ?? []).forEach((a) => {
        const k = a.specialty ?? "Sem especialidade";
        const m = map.get(k) ?? { specialty: k, total: 0, completed: 0, cancelled: 0, noShow: 0 };
        m.total++;
        if (a.status === "completed") m.completed++;
        if (a.status === "cancelled") m.cancelled++;
        if (a.status === "no_show") m.noShow++;
        map.set(k, m);
      });
      setRows(Array.from(map.values()).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [from, to]);
  const COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Consultas por Especialidade" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DateRange, { from, to, setFrom, setTo })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, {}) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: Stethoscope, title: "Sem consultas no período" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: 280, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Pie, { data: rows, dataKey: "total", nameKey: "specialty", innerRadius: 60, outerRadius: 100, label: true, children: rows.map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS[i % COLORS.length] }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {})
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2", children: "Especialidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Realizadas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Canceladas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Faltas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxa Comparecimento" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.specialty }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.total }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-green-600", children: r.completed }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-red-600", children: r.cancelled }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-amber-600", children: r.noShow }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
            r.total ? (r.completed / r.total * 100).toFixed(1) : 0,
            "%"
          ] })
        ] }, r.specialty)) })
      ] })
    ] }) })
  ] });
}
const STATUS_COLOR = { completed: "#22c55e", confirmed: "#3b82f6", scheduled: "#94a3b8", cancelled: "#ef4444", no_show: "#f59e0b", in_progress: "#a855f7" };
function AgendaReport() {
  const [from, setFrom] = reactExports.useState(firstDayOfMonth());
  const [to, setTo] = reactExports.useState(today());
  const [loading, setLoading] = reactExports.useState(true);
  const [rows, setRows] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("appointments").select("id, date, start_time, type, status, patients(full_name), profiles!appointments_professional_id_fkey(full_name), rooms(name)").gte("date", from).lte("date", to).order("date").order("start_time");
      setRows((data ?? []).map((a) => ({ id: a.id, date: a.date, start_time: a.start_time, type: a.type, status: a.status, patient: a.patients?.full_name ?? "—", professional: a.profiles?.full_name ?? "—", room: a.rooms?.name ?? "—" })));
      setLoading(false);
    })();
  }, [from, to]);
  const total = rows.length, done = rows.filter((r) => r.status === "completed").length, can = rows.filter((r) => r.status === "cancelled").length, ns = rows.filter((r) => r.status === "no_show").length;
  const byDay = {};
  rows.forEach((r) => {
    const d = r.date.slice(5);
    if (!byDay[d]) byDay[d] = { date: d };
    byDay[d][r.status] = (byDay[d][r.status] ?? 0) + 1;
  });
  const dayData = Object.values(byDay);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Relatório de Agenda" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DateRange, { from, to, setFrom, setTo })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 grid-cols-2 md:grid-cols-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold", children: total })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Realizadas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-green-600", children: done })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Canceladas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-red-600", children: can })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Faltas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-amber-600", children: ns })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Comparecimento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xl font-semibold", children: [
            total ? (done / total * 100).toFixed(0) : 0,
            "%"
          ] })
        ] }) })
      ] }),
      loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, {}) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: dayData, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "date", fontSize: 10 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { fontSize: 11 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {}),
          Object.keys(STATUS_COLOR).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: s, stackId: "a", fill: STATUS_COLOR[s], name: APPOINTMENT_STATUS_LABEL[s] ?? s }, s))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-x-auto max-h-96 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "sticky top-0 bg-card text-left text-xs text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2", children: "Data" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Hora" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Paciente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Profissional" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Consultório" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Situação" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: rows.slice(0, 100).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: fmtDate(r.date) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.start_time.slice(0, 5) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.patient }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.professional }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.room }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: APPOINTMENT_TYPE_LABEL[r.type] ?? r.type }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", style: { borderColor: STATUS_COLOR[r.status], color: STATUS_COLOR[r.status] }, children: APPOINTMENT_STATUS_LABEL[r.status] ?? r.status }) })
          ] }, r.id)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: () => downloadCSV("agenda.csv", [["Data", "Hora", "Paciente", "Profissional", "Consultorio", "Tipo", "Situacao"], ...rows.map((r) => [r.date, r.start_time, r.patient, r.professional, r.room, APPOINTMENT_TYPE_LABEL[r.type] ?? r.type, APPOINTMENT_STATUS_LABEL[r.status] ?? r.status])]), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4 mr-2" }),
          "Exportar planilha"
        ] })
      ] })
    ] })
  ] });
}
function FluxoReport() {
  const { profile } = useAuth();
  const [from, setFrom] = reactExports.useState(() => shiftDateISO(todayISO(), -30));
  const [to, setTo] = reactExports.useState(today());
  const [loading, setLoading] = reactExports.useState(true);
  const [tx, setTx] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: rec } = await supabase.from("bills_receivable").select("id, paid_date, description, payment_method, paid_amount, patients(full_name)").eq("status", "paid").gte("paid_date", from).lte("paid_date", to);
      const { data: pay } = await supabase.from("bills_payable").select("id, paid_date, description, supplier, payment_method, amount").eq("status", "paid").gte("paid_date", from).lte("paid_date", to);
      const ins = (rec ?? []).map((r) => ({ id: r.id, date: r.paid_date, type: "in", description: r.description, party: r.patients?.full_name ?? "—", method: r.payment_method ?? "—", amount: Number(r.paid_amount) }));
      const outs = (pay ?? []).map((p) => ({ id: p.id, date: p.paid_date, type: "out", description: p.description, party: p.supplier ?? "—", method: p.payment_method ?? "—", amount: Number(p.amount) }));
      setTx([...ins, ...outs].sort((a, b) => a.date.localeCompare(b.date)));
      setLoading(false);
    })();
  }, [from, to]);
  const grouped = reactExports.useMemo(() => {
    const g = {};
    tx.forEach((t) => {
      (g[t.date] ??= []).push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [tx]);
  const totalIn = tx.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = tx.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
  function exportPDF() {
    void printWithLetterhead(resolveLetterheadProfessionalId(profile));
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { children: "Fluxo de Caixa Detalhado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", size: "sm", onClick: exportPDF, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "size-4 mr-2" }),
          "Exportar documento"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DateRange, { from, to, setFrom, setTo })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "space-y-4", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, {}) : tx.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(EmptyState, { icon: BanknoteArrowDown, title: "Sem movimentações no período" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 grid-cols-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-l-4 border-l-green-500", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total Entradas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-green-600", children: fmt(totalIn) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-l-4 border-l-red-500", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Total Saídas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xl font-semibold text-red-600", children: fmt(totalOut) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { className: "border-l-4 border-l-primary", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Saldo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `text-xl font-semibold ${totalIn - totalOut >= 0 ? "text-green-600" : "text-red-600"}`, children: fmt(totalIn - totalOut) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-4", children: grouped.map(([date, items]) => {
        const dIn = items.filter((i) => i.type === "in").reduce((s, i) => s + i.amount, 0);
        const dOut = items.filter((i) => i.type === "out").reduce((s, i) => s + i.amount, 0);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-muted px-3 py-1 rounded text-sm font-semibold flex justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fmtDateShortWeekday(date) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs", children: [
              "Entradas: ",
              fmt(dIn),
              " · Saídas: ",
              fmt(dOut),
              " · Saldo: ",
              fmt(dIn - dOut)
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "w-full text-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: items.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: `border-t border-l-4 ${t.type === "in" ? "border-l-green-500" : "border-l-red-500"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2 w-24", children: t.type === "in" ? "Entrada" : "Saída" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-muted-foreground", children: t.party }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "text-muted-foreground", children: PAYMENT_LABEL[t.method] ?? t.method }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: `text-right font-medium ${t.type === "in" ? "text-green-600" : "text-red-600"}`, children: [
              t.type === "in" ? "+" : "−",
              " ",
              fmt(t.amount)
            ] })
          ] }, t.id)) }) })
        ] }, date);
      }) })
    ] }) })
  ] });
}
const SOURCE_COLORS = ["#3b82f6", "#a855f7", "#f59e0b", "#22c55e", "#ef4444", "#14b8a6"];
function PacientesReport() {
  const [loading, setLoading] = reactExports.useState(true);
  const [stats, setStats] = reactExports.useState({ active: 0, newMonth: 0, inactive: 0, returnRate: 0 });
  const [byMonth, setByMonth] = reactExports.useState([]);
  const [bySource, setBySource] = reactExports.useState([]);
  const [topVisits, setTopVisits] = reactExports.useState([]);
  const [topRevenue, setTopRevenue] = reactExports.useState([]);
  reactExports.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: pts } = await supabase.from("patients").select("id, full_name, created_at, active, how_did_you_find_us");
      const { data: appts } = await supabase.from("appointments").select("id, patient_id, date");
      const { data: bills } = await supabase.from("bills_receivable").select("patient_id, paid_amount, status").eq("status", "paid");
      const monthStart = firstDayOfMonthISO();
      const ninetyAgo = shiftDateISO(todayISO(), -90);
      const ps = pts ?? [];
      const as = appts ?? [];
      const bs = bills ?? [];
      const apCount = {};
      const apLast = {};
      as.forEach((a) => {
        apCount[a.patient_id] = (apCount[a.patient_id] ?? 0) + 1;
        if (!apLast[a.patient_id] || a.date > apLast[a.patient_id]) apLast[a.patient_id] = a.date;
      });
      const billTotal = {};
      bs.forEach((b) => {
        billTotal[b.patient_id] = (billTotal[b.patient_id] ?? 0) + Number(b.paid_amount);
      });
      const active = ps.filter((p) => p.active).length;
      const newMonth = ps.filter((p) => p.created_at.slice(0, 10) >= monthStart).length;
      const inactive = ps.filter((p) => {
        const last = apLast[p.id];
        return !last || last < ninetyAgo;
      }).length;
      const withTwo = Object.values(apCount).filter((c) => c >= 2).length;
      const returnRate = active ? withTwo / active * 100 : 0;
      setStats({ active, newMonth, inactive, returnRate });
      const months = {};
      for (let i = 11; i >= 0; i--) {
        months[addMonthsISO(firstDayOfMonthISO(), -i).slice(0, 7)] = 0;
      }
      ps.forEach((p) => {
        const k = p.created_at.slice(0, 7);
        if (k in months) months[k]++;
      });
      setByMonth(Object.entries(months).map(([month, count]) => ({ month: month.slice(5), count })));
      const sources = {};
      ps.forEach((p) => {
        const k = p.how_did_you_find_us ?? "Não informado";
        sources[k] = (sources[k] ?? 0) + 1;
      });
      setBySource(Object.entries(sources).map(([name, value]) => ({ name, value })));
      setTopVisits(ps.map((p) => ({ id: p.id, name: p.full_name, count: apCount[p.id] ?? 0, last: apLast[p.id] ?? "" })).sort((a, b) => b.count - a.count).slice(0, 10));
      setTopRevenue(ps.map((p) => ({ id: p.id, name: p.full_name, total: billTotal[p.id] ?? 0, last: apLast[p.id] ?? "" })).filter((p) => p.total > 0).sort((a, b) => b.total - a.total).slice(0, 10));
      setLoading(false);
    })();
  }, []);
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableSkeleton, {}) }) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 grid-cols-2 md:grid-cols-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Pacientes Ativos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-semibold", children: stats.active })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Novos este mês" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-semibold text-green-600", children: stats.newMonth })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Inativos +90 dias" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-semibold text-amber-600", children: stats.inactive })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: "Taxa de retorno" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-2xl font-semibold", children: [
          stats.returnRate.toFixed(1),
          "%"
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Novos pacientes (últimos 12 meses)" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: 240, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: byMonth, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CartesianGrid, { strokeDasharray: "3 3" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "month", fontSize: 11 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, { fontSize: 11 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "count", fill: "#3b82f6" })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Como nos conheceram" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { width: "100%", height: 240, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Pie, { data: bySource, dataKey: "value", nameKey: "name", innerRadius: 50, outerRadius: 90, label: true, children: bySource.map((_, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: SOURCE_COLORS[i % SOURCE_COLORS.length] }, i)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Legend, {})
        ] }) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Top 10 — Mais consultas" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2", children: "Paciente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Consultas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Última" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: topVisits.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.count }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.last ? fmtDate(r.last) : "—" })
          ] }, r.id)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Top 10 — Maior receita" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "text-left text-xs text-muted-foreground uppercase", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "p-2", children: "Paciente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Total pago" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Última consulta" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: topRevenue.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "p-2", children: r.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fmt(r.total) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.last ? fmtDate(r.last) : "—" })
          ] }, r.id)) })
        ] }) })
      ] })
    ] })
  ] });
}
export {
  ReportsPage as R
};
