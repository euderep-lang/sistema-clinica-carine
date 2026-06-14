import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { Receipt } from "lucide-react";
import { u as useAuth, D as DashboardShell, W as fmt, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, C as Card, c as CardContent, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, X as fmtDate, m as Badge } from "./router-uS_mSfDy.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { S as StatCard } from "./stat-card-Bk733V-w.js";
import { P as PageSection } from "./page-section-DTIXSD0d.js";
import { s as supabase } from "./client-CUE-_UGz.js";
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
const STATUS_LABEL = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado"
};
function ProfessionalBudgetsPage() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      let q = supabase.from("budgets").select("id,number,date,valid_until,status,subtotal,final_value,patients(full_name)").eq("professional_id", profile.id).order("date", {
        ascending: false
      });
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
    return rows.filter((r) => String(r.number).includes(q) || (r.patients?.full_name?.toLowerCase().includes(q) ?? false));
  }, [rows, search]);
  const totals = useMemo(() => ({
    count: filtered.length,
    value: filtered.reduce((s, r) => s + Number(r.final_value), 0),
    approved: filtered.filter((r) => r.status === "approved").length
  }), [filtered]);
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Orçamentos", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Orçamentos", description: "Propostas de tratamento emitidas por você." }),
    /* @__PURE__ */ jsx(PageSection, { title: "Resumo", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-3", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Total de orçamentos", value: totals.count, icon: Receipt }),
      /* @__PURE__ */ jsx(StatCard, { label: "Valor total", value: fmt(totals.value), icon: Receipt }),
      /* @__PURE__ */ jsx(StatCard, { label: "Aprovados", value: totals.approved, icon: Receipt, tone: "success" })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsx(Input, { placeholder: "Buscar por paciente ou número…", value: search, onChange: (e) => setSearch(e.target.value), className: "w-64" }),
      /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
          Object.entries(STATUS_LABEL).map(([k, v]) => /* @__PURE__ */ jsx(SelectItem, { value: k, children: v }, k))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Nº" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Validade" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Nenhum orçamento encontrado." }) }) : filtered.map((r) => /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxs(TableCell, { className: "font-mono", children: [
          "#",
          r.number
        ] }),
        /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.date) }),
        /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: r.patients?.full_name ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.valid_until) }),
        /* @__PURE__ */ jsx(TableCell, { children: fmt(r.final_value) }),
        /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", children: STATUS_LABEL[r.status] ?? r.status }) })
      ] }, r.id)) })
    ] }) }) })
  ] }) });
}
export {
  ProfessionalBudgetsPage as component
};
