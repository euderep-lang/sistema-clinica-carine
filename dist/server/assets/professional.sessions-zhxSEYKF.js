import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from "react";
import { CalendarCheck } from "lucide-react";
import { P as PatientSessionsDialog } from "./patient-sessions-dialog-BxCs_7zO.js";
import { P as Progress, S as SessionCheckoffDialog, a as SessionHistoryDialog } from "./session-history-dialog-BiwazhLa.js";
import { u as useAuth, D as DashboardShell, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, q as Badge, C as Card, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, B as Button } from "./router-C3L3OxIm.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PageSection } from "./page-section-BwYEiYgr.js";
import { s as supabase } from "../server.js";
import "@radix-ui/react-progress";
import "sonner";
import "./scroll-area-DdVoVpiO.js";
import "@radix-ui/react-scroll-area";
import "@tanstack/react-query";
import "@tanstack/react-router";
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
function ProfessionalSessionsPage() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const load = useCallback(async () => {
    if (!profile) return [];
    setLoading(true);
    let query = supabase.from("patient_session_packages").select("id,patient_id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name),patients(full_name)").eq("tenant_id", profile.tenant_id).order("purchased_at", {
      ascending: false
    });
    if (status !== "all") query = query.eq("status", status);
    const {
      data,
      error
    } = await query;
    if (error) console.error(error);
    const mapped = (data ?? []).map((row) => {
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
    });
    setRows(mapped);
    setLoading(false);
    return mapped;
  }, [profile, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.patient_name.toLowerCase().includes(q) || r.service_name.toLowerCase().includes(q));
  }, [rows, search]);
  const patientGroups = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const row of filtered) {
      const existing = map.get(row.patient_id);
      if (existing) {
        existing.packages.push(row);
      } else {
        map.set(row.patient_id, {
          patient_id: row.patient_id,
          patient_name: row.patient_name,
          packages: [row]
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.patient_name.localeCompare(b.patient_name, "pt-BR"));
  }, [filtered]);
  const activePackageCount = rows.filter((r) => r.status === "active").length;
  const activePatientCount = useMemo(() => new Set(rows.filter((r) => r.status === "active").map((r) => r.patient_id)).size, [rows]);
  const openPatient = (group) => {
    setSelectedGroup(group);
    setPatientDialogOpen(true);
  };
  const toTarget = (pkg, patientName) => ({
    packageId: pkg.id,
    patientName,
    serviceName: pkg.service_name,
    usedSessions: pkg.used_sessions,
    totalSessions: pkg.total_sessions
  });
  const openCheckoff = (pkg, patientName) => {
    setCheckoffTarget(toTarget(pkg, patientName));
    setCheckoffOpen(true);
  };
  const openHistory = (pkg, patientName) => {
    setHistoryTarget(toTarget(pkg, patientName));
    setHistoryOpen(true);
  };
  const summarizeGroup = (group) => {
    const totalSessions = group.packages.reduce((s, p) => s + p.total_sessions, 0);
    const usedSessions = group.packages.reduce((s, p) => s + p.used_sessions, 0);
    const remaining = totalSessions - usedSessions;
    const pct = totalSessions > 0 ? Math.round(usedSessions / totalSessions * 100) : 0;
    const canCheckoff = group.packages.some((p) => p.status === "active" && p.used_sessions < p.total_sessions);
    return {
      totalSessions,
      usedSessions,
      remaining,
      pct,
      canCheckoff
    };
  };
  const refreshSelectedGroup = (patientId, freshRows) => {
    const packages = freshRows.filter((r) => r.patient_id === patientId);
    if (packages.length === 0) {
      setPatientDialogOpen(false);
      setSelectedGroup(null);
      return;
    }
    setSelectedGroup({
      patient_id: patientId,
      patient_name: packages[0].patient_name,
      packages
    });
  };
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
          activePatientCount,
          " paciente",
          activePatientCount !== 1 ? "s" : "",
          " · ",
          activePackageCount,
          " ",
          "ativo",
          activePackageCount !== 1 ? "s" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(Table, { children: [
        /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
          /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Pacotes" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Progresso" }),
          /* @__PURE__ */ jsx(TableHead, { children: "Pendentes" }),
          /* @__PURE__ */ jsx(TableHead, { className: "text-center", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : patientGroups.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "py-10 text-center text-muted-foreground", children: "Nenhum pacote de sessões encontrado." }) }) : patientGroups.map((group) => {
          const summary = summarizeGroup(group);
          return /* @__PURE__ */ jsxs(TableRow, { className: "cursor-pointer hover:bg-muted/50", onClick: () => openPatient(group), children: [
            /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: group.patient_name }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                group.packages.length,
                " pacote",
                group.packages.length !== 1 ? "s" : ""
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground line-clamp-1", children: group.packages.map((p) => p.service_name).join(" · ") })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "min-w-[10rem]", children: /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx(Progress, { value: summary.pct, className: "h-1.5" }),
              /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
                summary.usedSessions,
                "/",
                summary.totalSessions,
                " realizadas"
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsxs(Badge, { variant: summary.remaining > 0 ? "default" : "secondary", children: [
              summary.remaining,
              " sessão",
              summary.remaining !== 1 ? "ões" : ""
            ] }) }),
            /* @__PURE__ */ jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsx(Button, { size: "sm", onClick: (e) => {
              e.stopPropagation();
              openPatient(group);
            }, children: summary.canCheckoff ? "Dar baixa" : "Ver pacotes" }) })
          ] }, group.patient_id);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(PatientSessionsDialog, { open: patientDialogOpen, onOpenChange: setPatientDialogOpen, group: selectedGroup, onCheckoff: (pkg) => {
      if (!selectedGroup) return;
      openCheckoff(pkg, selectedGroup.patient_name);
    }, onHistory: (pkg) => {
      if (!selectedGroup) return;
      openHistory(pkg, selectedGroup.patient_name);
    } }),
    /* @__PURE__ */ jsx(SessionCheckoffDialog, { open: checkoffOpen, onOpenChange: setCheckoffOpen, target: checkoffTarget, onSuccess: async () => {
      const patientId = selectedGroup?.patient_id;
      const fresh = await load();
      if (patientId && patientDialogOpen) refreshSelectedGroup(patientId, fresh);
    } }),
    /* @__PURE__ */ jsx(SessionHistoryDialog, { open: historyOpen, onOpenChange: setHistoryOpen, target: historyTarget })
  ] });
}
export {
  ProfessionalSessionsPage as component
};
