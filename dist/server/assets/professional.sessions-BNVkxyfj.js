import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { P as Progress, S as SessionCheckoffDialog, a as SessionHistoryDialog } from "./progress-CSaorDt4.js";
import { u as useAuth, D as DashboardShell, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, m as Badge, C as Card, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, W as fmt, B as Button } from "./router-CL5eFCiw.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-H2GO3e-V.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import "sonner";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-progress";
import "@tanstack/react-query";
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
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado"
};
function ProfessionalSessionsPage() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase.from("patient_session_packages").select("id,patient_id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name),patients(full_name)").eq("professional_id", profile.id).order("purchased_at", {
      ascending: false
    });
    if (status !== "all") query = query.eq("status", status);
    const {
      data,
      error
    } = await query;
    if (error) console.error(error);
    setRows((data ?? []).map((row) => {
      const svc = row.services;
      const pat = row.patients;
      return {
        id: row.id,
        patient_id: row.patient_id,
        patient_name: (Array.isArray(pat) ? pat[0]?.full_name : pat?.full_name) ?? "—",
        service_name: (Array.isArray(svc) ? svc[0]?.name : svc?.name) ?? "Procedimento",
        total_sessions: row.total_sessions,
        used_sessions: row.used_sessions,
        status: row.status,
        purchased_at: row.purchased_at,
        unit_price: Number(row.unit_price)
      };
    }));
    setLoading(false);
  }, [profile, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const toTarget = (row) => ({
    packageId: row.id,
    patientName: row.patient_name,
    serviceName: row.service_name,
    usedSessions: row.used_sessions,
    totalSessions: row.total_sessions
  });
  const openCheckoff = (row) => {
    setCheckoffTarget(toTarget(row));
    setCheckoffOpen(true);
  };
  const openHistory = (row) => {
    setHistoryTarget(toTarget(row));
    setHistoryOpen(true);
  };
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.patient_name.toLowerCase().includes(q) || r.service_name.toLowerCase().includes(q));
  }, [rows, search]);
  const activeCount = rows.filter((r) => r.status === "active").length;
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Sessões", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Sessões", description: "Pacotes e protocolos vendidos — acompanhe sessões realizadas e pendentes.", icon: CalendarCheck }),
    /* @__PURE__ */ jsxs(PageSection, { children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsx(Input, { placeholder: "Buscar paciente ou procedimento…", value: search, onChange: (e) => setSearch(e.target.value), className: "max-w-sm" }),
        /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "active", children: "Em andamento" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "completed", children: "Concluídos" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "cancelled", children: "Cancelados" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Badge, { variant: "secondary", children: [
          activeCount,
          " ativos"
        ] })
      ] }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Procedimento" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Progresso" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Compra" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 7, className: "py-10 text-center text-muted-foreground", children: "Nenhum pacote de sessões encontrado." }) }) : filtered.map((row) => {
          const pct = Math.round(row.used_sessions / row.total_sessions * 100);
          const remaining = row.total_sessions - row.used_sessions;
          return /* @__PURE__ */ jsxs(TableRow, { children: [
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Link, { to: "/professional/patients/$id/record", params: {
              id: row.patient_id
            }, className: "font-medium text-primary hover:underline", children: row.patient_name }) }),
            /* @__PURE__ */ jsx(TableCell, { children: row.service_name }),
            /* @__PURE__ */ jsx(TableCell, { className: "min-w-[10rem]", children: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx(Progress, { value: pct, className: "h-1.5" }),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
                row.used_sessions,
                "/",
                row.total_sessions,
                row.status === "active" && ` · ${remaining} restantes`
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { children: fmt(row.unit_price) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: row.status === "active" ? "default" : "secondary", children: STATUS_LABEL[row.status] ?? row.status }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-sm text-muted-foreground", children: new Date(row.purchased_at).toLocaleDateString("pt-BR") }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap justify-center gap-1", children: [
              row.used_sessions > 0 && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => openHistory(row), children: "Histórico" }),
              row.status === "active" && row.used_sessions < row.total_sessions && /* @__PURE__ */ jsx(Button, { size: "sm", onClick: () => openCheckoff(row), children: "Dar baixa" })
            ] }) })
          ] }, row.id);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(SessionCheckoffDialog, { open: checkoffOpen, onOpenChange: setCheckoffOpen, target: checkoffTarget, onSuccess: () => void load() }),
    /* @__PURE__ */ jsx(SessionHistoryDialog, { open: historyOpen, onOpenChange: setHistoryOpen, target: historyTarget })
  ] });
}
export {
  ProfessionalSessionsPage as component
};
