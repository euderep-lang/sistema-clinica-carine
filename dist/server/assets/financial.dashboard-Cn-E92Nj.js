import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, TrendingUp, Wallet, TrendingDown, BarChart3 } from "lucide-react";
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line } from "recharts";
import { ae as isOverdue, D as DashboardShell, X as fmt, C as Card, a as CardHeader, b as CardTitle, c as CardContent, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, W as fmtDate, m as Badge, af as BILL_STATUS_LABEL, ag as BILL_STATUS_CLASS } from "./router-wbAJq94_.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-CTO8Lkaz.js";
import { S as StatCard } from "./stat-card-C65Pc1wT.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import "@tanstack/react-query";
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
import "@supabase/supabase-js";
function Dashboard() {
  const [recv, setRecv] = useState([]);
  const [pay, setPay] = useState([]);
  useEffect(() => {
    (async () => {
      const {
        data: r
      } = await supabase.from("bills_receivable").select("id, description, amount, paid_amount, due_date, paid_date, status, patients(full_name)").order("due_date");
      setRecv(r ?? []);
      const {
        data: p
      } = await supabase.from("bills_payable").select("id, description, supplier, amount, due_date, paid_date, status").order("due_date");
      setPay(p ?? []);
    })();
  }, []);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const monthIncome = recv.filter((b) => b.paid_date && b.paid_date.startsWith(month)).reduce((s, b) => s + Number(b.paid_amount), 0);
  const monthExpense = pay.filter((b) => b.paid_date && b.paid_date.startsWith(month)).reduce((s, b) => s + Number(b.amount), 0);
  const toReceive = recv.filter((b) => b.status === "pending" || b.status === "partial" || b.status === "overdue").reduce((s, b) => s + (Number(b.amount) - Number(b.paid_amount)), 0);
  const toPay = pay.filter((b) => b.status === "pending" || b.status === "overdue").reduce((s, b) => s + Number(b.amount), 0);
  const result = monthIncome - monthExpense;
  const days = [];
  let cumulative = 0;
  for (let i = 29; i >= 0; i--) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const inc = recv.filter((b) => b.paid_date === k).reduce((s, b) => s + Number(b.paid_amount), 0);
    const exp = pay.filter((b) => b.paid_date === k).reduce((s, b) => s + Number(b.amount), 0);
    cumulative += inc - exp;
    days.push({
      day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      income: inc,
      expense: exp,
      balance: cumulative
    });
  }
  const overdueRecv = recv.filter((b) => isOverdue(b.due_date, b.status));
  const overduePay = pay.filter((b) => isOverdue(b.due_date, b.status));
  const upcomingRecv = recv.filter((b) => b.status === "pending" || b.status === "partial" || b.status === "overdue").slice(0, 5);
  const upcomingPay = pay.filter((b) => b.status === "pending" || b.status === "overdue").slice(0, 5);
  const overdueCount = overdueRecv.length + overduePay.length;
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Painel Financeiro", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Financeiro", description: "Receitas, despesas e fluxo de caixa da clínica." }),
    overdueCount > 0 && /* @__PURE__ */ jsxs("div", { role: "alert", className: "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground", children: [
      /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "size-4 text-destructive", "aria-hidden": true }),
        "Você tem ",
        overdueCount,
        " conta",
        overdueCount > 1 ? "s" : "",
        " vencida",
        overdueCount > 1 ? "s" : "",
        "."
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/financial/receivables", className: "cursor-pointer text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80", children: "Ver detalhes →" })
    ] }),
    /* @__PURE__ */ jsx(PageSection, { title: "Resumo do mês", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Receita do mês", value: fmt(monthIncome), icon: TrendingUp, tone: "success" }),
      /* @__PURE__ */ jsx(StatCard, { label: "A receber", value: fmt(toReceive), icon: Wallet }),
      /* @__PURE__ */ jsx(StatCard, { label: "A pagar", value: fmt(toPay), icon: TrendingDown, tone: "warning" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Resultado do mês", value: fmt(result), icon: BarChart3, tone: result >= 0 ? "success" : "danger" })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Fluxo de caixa — últimos 30 dias" }) }),
        /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", { className: "h-72 w-full", children: /* @__PURE__ */ jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxs(ComposedChart, { data: days, children: [
          /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
          /* @__PURE__ */ jsx(XAxis, { dataKey: "day" }),
          /* @__PURE__ */ jsx(YAxis, {}),
          /* @__PURE__ */ jsx(Tooltip, { formatter: (v) => fmt(v) }),
          /* @__PURE__ */ jsx(Legend, {}),
          /* @__PURE__ */ jsx(Bar, { dataKey: "income", name: "Receita", fill: "var(--color-success)" }),
          /* @__PURE__ */ jsx(Bar, { dataKey: "expense", name: "Despesa", fill: "var(--color-destructive)" }),
          /* @__PURE__ */ jsx(Line, { type: "monotone", dataKey: "balance", name: "Saldo acumulado", stroke: "var(--color-primary)", strokeWidth: 2 })
        ] }) }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Próximos a receber" }) }),
          /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: upcomingRecv.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "text-center text-muted-foreground py-6", children: "Nada pendente" }) }) : upcomingRecv.map((b) => /* @__PURE__ */ jsxs(TableRow, { className: isOverdue(b.due_date, b.status) ? "border-l-4 border-l-red-500" : "", children: [
              /* @__PURE__ */ jsx(TableCell, { children: b.patients?.full_name ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: b.description }),
              /* @__PURE__ */ jsx(TableCell, { children: fmt(b.amount) }),
              /* @__PURE__ */ jsx(TableCell, { children: fmtDate(b.due_date) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[isOverdue(b.due_date, b.status) ? "overdue" : b.status], children: BILL_STATUS_LABEL[isOverdue(b.due_date, b.status) ? "overdue" : b.status] }) })
            ] }, b.id)) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Próximas a pagar" }) }),
          /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Fornecedor" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: upcomingPay.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "text-center text-muted-foreground py-6", children: "Nada pendente" }) }) : upcomingPay.map((b) => /* @__PURE__ */ jsxs(TableRow, { className: isOverdue(b.due_date, b.status) ? "border-l-4 border-l-red-500" : "", children: [
              /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: b.description }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: b.supplier ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { children: fmt(b.amount) }),
              /* @__PURE__ */ jsx(TableCell, { children: fmtDate(b.due_date) }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[isOverdue(b.due_date, b.status) ? "overdue" : b.status], children: BILL_STATUS_LABEL[isOverdue(b.due_date, b.status) ? "overdue" : b.status] }) })
            ] }, b.id)) })
          ] }) })
        ] })
      ] })
    ] })
  ] });
}
export {
  Dashboard as component
};
