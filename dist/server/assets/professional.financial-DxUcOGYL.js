import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { u as useAuth, D as DashboardShell, W as fmt, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, _ as BILL_STATUS_LABEL, C as Card, c as CardContent, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, $ as isOverdue, X as fmtDate, a0 as PAYMENT_LABEL, m as Badge, a1 as BILL_STATUS_CLASS } from "./router-CL5eFCiw.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-H2GO3e-V.js";
import { S as StatCard } from "./stat-card-CTpiONgn.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { p as periodFromYearMonth, c as currentYearMonth } from "./commission-B9zJlqRy.js";
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
import "./letterhead-pdf-4K2s0GWH.js";
import "@supabase/supabase-js";
function ProfessionalFinancialPage() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [commissionPct, setCommissionPct] = useState(0);
  const period = periodFromYearMonth(currentYearMonth());
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const {
        data: prof
      } = await supabase.from("profiles").select("commission_pct").eq("id", profile.id).maybeSingle();
      setCommissionPct(Number(prof?.commission_pct ?? 0));
      let q = supabase.from("bills_receivable").select("id,description,amount,paid_amount,due_date,paid_date,payment_method,status,patients(full_name)").eq("professional_id", profile.id).order("due_date", {
        ascending: false
      }).limit(100);
      if (status !== "all") q = q.eq("status", status);
      const {
        data
      } = await q;
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [profile, status]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.description.toLowerCase().includes(q) || (r.patients?.full_name?.toLowerCase().includes(q) ?? false));
  }, [rows, search]);
  const stats = useMemo(() => {
    if (!period) return {
      production: 0,
      received: 0,
      pending: 0
    };
    let production = 0;
    let received = 0;
    let pending = 0;
    for (const r of rows) {
      if (r.due_date >= period.from && r.due_date <= period.to) {
        production += Number(r.amount);
        if (["pending", "partial", "overdue"].includes(r.status)) {
          pending += Number(r.amount) - Number(r.paid_amount);
        }
      }
      if (r.paid_date && r.paid_date >= period.from && r.paid_date <= period.to && (r.status === "paid" || r.status === "partial")) {
        received += Number(r.paid_amount);
      }
    }
    return {
      production,
      received,
      pending
    };
  }, [rows, period]);
  const commissionEst = stats.received * (commissionPct / 100);
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Financeiro", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Meu financeiro", description: "Cobranças vinculadas aos seus atendimentos e estimativa de comissão do mês." }),
    /* @__PURE__ */ jsx(PageSection, { title: "Resumo do mês", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Produção", value: fmt(stats.production), icon: Wallet }),
      /* @__PURE__ */ jsx(StatCard, { label: "Recebido", value: fmt(stats.received), icon: TrendingUp, tone: "success" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Pendente", value: fmt(stats.pending), icon: TrendingDown, tone: "warning" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Comissão estimada", value: fmt(commissionEst), sub: `${commissionPct}% sobre recebido`, icon: Wallet })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsx(Input, { placeholder: "Buscar paciente ou descrição…", value: search, onChange: (e) => setSearch(e.target.value), className: "w-64" }),
      /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
          Object.entries(BILL_STATUS_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Recebido" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Forma" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Nenhuma cobrança encontrada." }) }) : filtered.map((r) => {
        const eff = isOverdue(r.due_date, r.status) ? "overdue" : r.status;
        return /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableCell, { children: r.patients?.full_name ?? "—" }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: r.description }),
          /* @__PURE__ */ jsx(TableCell, { children: fmt(r.amount) }),
          /* @__PURE__ */ jsx(TableCell, { children: fmt(r.paid_amount) }),
          /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.due_date) }),
          /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: r.payment_method ? PAYMENT_LABEL[r.payment_method] : "—" }),
          /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: BILL_STATUS_CLASS[eff], children: BILL_STATUS_LABEL[eff] }) })
        ] }, r.id);
      }) })
    ] }) }) })
  ] }) });
}
export {
  ProfessionalFinancialPage as component
};
