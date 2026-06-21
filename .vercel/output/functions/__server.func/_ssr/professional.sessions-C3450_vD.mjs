import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { P as PatientSessionsDialog } from "./patient-sessions-dialog-C3xXiwPp.mjs";
import { P as Progress, S as SessionCheckoffDialog, a as SessionHistoryDialog } from "./session-history-dialog-DtjYYz5K.mjs";
import { u as useAuth, D as DashboardShell, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, q as Badge, C as Card, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, B as Button } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { P as PageSection } from "./page-section-B6uCwEd5.mjs";
import { s as supabase } from "./index.mjs";
import "../_libs/sonner.mjs";
import "../_libs/jspdf.mjs";
import { j as CalendarCheck } from "../_libs/lucide-react.mjs";
import "../_libs/radix-ui__react-progress.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "./scroll-area-B1YvI_Sp.mjs";
import "../_libs/radix-ui__react-scroll-area.mjs";
import "../_libs/radix-ui__react-presence.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/radix-ui__number.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/isbot.mjs";
import "../_libs/clsx.mjs";
import "../_libs/tailwind-merge.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/radix-ui__react-separator.mjs";
import "../_libs/radix-ui__react-dialog.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-focus-guards.mjs";
import "../_libs/react-remove-scroll.mjs";
import "tslib";
import "../_libs/react-remove-scroll-bar.mjs";
import "../_libs/react-style-singleton.mjs";
import "../_libs/get-nonce.mjs";
import "../_libs/use-sidecar.mjs";
import "../_libs/use-callback-ref.mjs";
import "../_libs/aria-hidden.mjs";
import "../_libs/radix-ui__react-tooltip.mjs";
import "../_libs/radix-ui__react-popper.mjs";
import "../_libs/floating-ui__react-dom.mjs";
import "../_libs/floating-ui__dom.mjs";
import "../_libs/floating-ui__core.mjs";
import "../_libs/floating-ui__utils.mjs";
import "../_libs/radix-ui__react-arrow.mjs";
import "../_libs/radix-ui__react-use-size.mjs";
import "../_libs/@radix-ui/react-visually-hidden+[...].mjs";
import "../_libs/radix-ui__react-avatar.mjs";
import "../_libs/@radix-ui/react-use-is-hydrated+[...].mjs";
import "../_libs/radix-ui__react-dropdown-menu.mjs";
import "../_libs/radix-ui__react-menu.mjs";
import "../_libs/radix-ui__react-collection.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "./patient-utils-YNqCHR6o.mjs";
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__react-use-previous.mjs";
import "../_libs/radix-ui__react-label.mjs";
import "../_libs/cmdk.mjs";
import "../_libs/radix-ui__react-switch.mjs";
import "../_libs/radix-ui__react-checkbox.mjs";
import "./letterhead-pdf-8X66Bk4t.mjs";
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "../_libs/supabase__functions-js.mjs";
import "fs";
import "path";
import "../_libs/fflate.mjs";
import "../_libs/fast-png.mjs";
import "../_libs/iobuffer.mjs";
import "../_libs/pako.mjs";
import "../_libs/html2canvas.mjs";
import "../_libs/dompurify.mjs";
import "../_libs/canvg.mjs";
import "../_libs/core-js.mjs";
import "../_libs/babel__runtime.mjs";
import "../_libs/raf.mjs";
import "../_libs/performance-now.mjs";
import "../_libs/rgbcolor.mjs";
import "../_libs/svg-pathdata.mjs";
import "../_libs/stackblur-canvas.mjs";
function ProfessionalSessionsPage() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = reactExports.useState([]);
  const [status, setStatus] = reactExports.useState("active");
  const [search, setSearch] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [patientDialogOpen, setPatientDialogOpen] = reactExports.useState(false);
  const [selectedGroup, setSelectedGroup] = reactExports.useState(null);
  const [checkoffOpen, setCheckoffOpen] = reactExports.useState(false);
  const [checkoffTarget, setCheckoffTarget] = reactExports.useState(null);
  const [historyOpen, setHistoryOpen] = reactExports.useState(false);
  const [historyTarget, setHistoryTarget] = reactExports.useState(null);
  const load = reactExports.useCallback(async () => {
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
  reactExports.useEffect(() => {
    void load();
  }, [load]);
  const filtered = reactExports.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.patient_name.toLowerCase().includes(q) || r.service_name.toLowerCase().includes(q));
  }, [rows, search]);
  const patientGroups = reactExports.useMemo(() => {
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
  const activePatientCount = reactExports.useMemo(() => new Set(rows.filter((r) => r.status === "active").map((r) => r.patient_id)).size, [rows]);
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Sessões", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Sessões", description: "Pacotes e protocolos vendidos — acompanhe sessões realizadas e pendentes.", icon: CalendarCheck }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(PageSection, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Buscar paciente ou procedimento…", value: search, onChange: (e) => setSearch(e.target.value), className: "max-w-sm" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: status, onValueChange: setStatus, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "active", children: "Em andamento" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "completed", children: "Concluídos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "cancelled", children: "Cancelados" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "secondary", children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Paciente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Pacotes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Progresso" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Pendentes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-center", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : patientGroups.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, className: "py-10 text-center text-muted-foreground", children: "Nenhum pacote de sessões encontrado." }) }) : patientGroups.map((group) => {
          const summary = summarizeGroup(group);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: "cursor-pointer hover:bg-muted/50", onClick: () => openPatient(group), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium", children: group.patient_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm", children: [
                group.packages.length,
                " pacote",
                group.packages.length !== 1 ? "s" : ""
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground line-clamp-1", children: group.packages.map((p) => p.service_name).join(" · ") })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "min-w-[10rem]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, { value: summary.pct, className: "h-1.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                summary.usedSessions,
                "/",
                summary.totalSessions,
                " realizadas"
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: summary.remaining > 0 ? "default" : "secondary", children: [
              summary.remaining,
              " sessão",
              summary.remaining !== 1 ? "ões" : ""
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", onClick: (e) => {
              e.stopPropagation();
              openPatient(group);
            }, children: summary.canCheckoff ? "Dar baixa" : "Ver pacotes" }) })
          ] }, group.patient_id);
        }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PatientSessionsDialog, { open: patientDialogOpen, onOpenChange: setPatientDialogOpen, group: selectedGroup, onCheckoff: (pkg) => {
      if (!selectedGroup) return;
      openCheckoff(pkg, selectedGroup.patient_name);
    }, onHistory: (pkg) => {
      if (!selectedGroup) return;
      openHistory(pkg, selectedGroup.patient_name);
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SessionCheckoffDialog, { open: checkoffOpen, onOpenChange: setCheckoffOpen, target: checkoffTarget, onSuccess: async () => {
      const patientId = selectedGroup?.patient_id;
      const fresh = await load();
      if (patientId && patientDialogOpen) refreshSelectedGroup(patientId, fresh);
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SessionHistoryDialog, { open: historyOpen, onOpenChange: setHistoryOpen, target: historyTarget })
  ] });
}
export {
  ProfessionalSessionsPage as component
};
