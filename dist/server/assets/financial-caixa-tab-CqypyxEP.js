import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from "react";
import { ArrowDownLeft, Landmark, ArrowUpRight } from "lucide-react";
import { P as PageSection } from "./page-section-DYrcOGE9.js";
import { S as StatCard } from "./stat-card-CXtIWEk7.js";
import { u as useAuth, L as Label, I as Input, C as Card, b as CardHeader, e as CardTitle, f as CardContent, q as Badge, af as PAYMENT_LABEL, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell } from "./router-DKQJQoSP.js";
import { t as todayISO, s as supabase, d as fmt, f as fmtDate } from "../server.js";
import { l as loadProfessionalExpenses } from "./expenses-qnPI0Lnj.js";
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
function FinancialCaixaTab() {
  const { profile } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [{ data: payData }, expenseData] = await Promise.all([
      supabase.from("bill_payments").select(
        "id, amount, net_amount, fee_amount, payment_method, paid_date, notes, patients(full_name), bills_receivable(description)"
      ).eq("professional_id", profile.id).eq("status", "active").eq("paid_date", date).order("created_at", { ascending: false }),
      loadProfessionalExpenses(profile.id, {
        from: date,
        to: date,
        dateField: "paid_date",
        status: "paid"
      })
    ]);
    setPayments(payData ?? []);
    setExpenses(expenseData);
    setLoading(false);
  }, [profile, date]);
  useEffect(() => {
    void load();
  }, [load]);
  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) => (p.patients?.full_name?.toLowerCase().includes(q) ?? false) || (p.bills_receivable?.description?.toLowerCase().includes(q) ?? false) || (p.notes?.toLowerCase().includes(q) ?? false)
    );
  }, [payments, search]);
  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => e.description.toLowerCase().includes(q));
  }, [expenses, search]);
  const stats = useMemo(() => {
    const inflow = payments.reduce((s, p) => s + Number(p.net_amount ?? p.amount), 0);
    const fees = payments.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
    const outflow = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byMethod = /* @__PURE__ */ new Map();
    for (const p of payments) {
      const k = p.payment_method;
      byMethod.set(k, (byMethod.get(k) ?? 0) + Number(p.net_amount ?? p.amount));
    }
    return { inflow, fees, outflow, balance: inflow - outflow, byMethod };
  }, [payments, expenses]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Data do caixa" }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-44" })
      ] }),
      /* @__PURE__ */ jsx(
        Input,
        {
          placeholder: "Buscar movimentação…",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          className: "w-64"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(PageSection, { title: `Caixa — ${fmtDate(date)}`, children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Entradas (líquido)", value: fmt(stats.inflow), icon: ArrowDownLeft, tone: "success" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Taxas", value: fmt(stats.fees), icon: Landmark, tone: "warning" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Saídas", value: fmt(stats.outflow), icon: ArrowUpRight, tone: "danger" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Saldo do dia", value: fmt(stats.balance), icon: Landmark })
    ] }) }),
    stats.byMethod.size > 0 && /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Entradas por forma de pagamento" }) }),
      /* @__PURE__ */ jsx(CardContent, { className: "flex flex-wrap gap-2", children: Array.from(stats.byMethod.entries()).map(([method, value]) => /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "px-3 py-1", children: [
        PAYMENT_LABEL[method] ?? method,
        ": ",
        fmt(value)
      ] }, method)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base text-emerald-700", children: "Recebimentos do dia" }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Líquido" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Carregando…" }) }) : filteredPayments.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Nenhum recebimento neste dia." }) }) : filteredPayments.map((p) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: p.patients?.full_name ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { className: "max-w-[160px] truncate text-sm", children: p.bills_receivable?.description ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: PAYMENT_LABEL[p.payment_method] ?? p.payment_method }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: fmt(p.net_amount ?? p.amount) })
          ] }, p.id)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base text-red-700", children: "Despesas pagas no dia" }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
          /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Categoria" }),
            /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
            /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Valor" })
          ] }) }),
          /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Carregando…" }) }) : filteredExpenses.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "py-8 text-center text-muted-foreground", children: "Nenhuma despesa paga neste dia." }) }) : filteredExpenses.map((e) => /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: e.description }),
            /* @__PURE__ */ jsx(TableCell, { children: e.category ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: e.payment_method ? PAYMENT_LABEL[e.payment_method] : "—" }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-right font-medium", children: fmt(e.amount) })
          ] }, e.id)) })
        ] }) })
      ] })
    ] })
  ] });
}
export {
  FinancialCaixaTab
};
