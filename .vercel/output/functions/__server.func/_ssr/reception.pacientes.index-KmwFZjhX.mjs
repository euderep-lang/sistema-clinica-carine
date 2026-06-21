import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useAuth, D as DashboardShell, B as Button, C as Card, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, I as Input, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell } from "./router-DcWaovdP.mjs";
import { P as PageHeader } from "./page-header-BNsdM97h.mjs";
import { P as PatientShortcuts } from "./patient-shortcuts-BM9n5bub.mjs";
import { P as PatientSessionsDialog } from "./patient-sessions-dialog-C3xXiwPp.mjs";
import { s as supabase } from "./index.mjs";
import { P as PatientFormDialog } from "./patient-form-dialog-S2mCVA4Z.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, S as Search, i as Users } from "../_libs/lucide-react.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
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
import "../_libs/radix-ui__react-slot.mjs";
import "../_libs/radix-ui__react-compose-refs.mjs";
import "../_libs/class-variance-authority.mjs";
import "../_libs/radix-ui__react-separator.mjs";
import "../_libs/radix-ui__react-primitive.mjs";
import "../_libs/radix-ui__react-dialog.mjs";
import "../_libs/radix-ui__primitive.mjs";
import "../_libs/radix-ui__react-context.mjs";
import "../_libs/radix-ui__react-id.mjs";
import "../_libs/@radix-ui/react-use-layout-effect+[...].mjs";
import "../_libs/@radix-ui/react-use-controllable-state+[...].mjs";
import "../_libs/@radix-ui/react-dismissable-layer+[...].mjs";
import "../_libs/@radix-ui/react-use-callback-ref+[...].mjs";
import "../_libs/@radix-ui/react-use-escape-keydown+[...].mjs";
import "../_libs/radix-ui__react-focus-scope.mjs";
import "../_libs/radix-ui__react-portal.mjs";
import "../_libs/radix-ui__react-presence.mjs";
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
import "../_libs/radix-ui__react-direction.mjs";
import "../_libs/radix-ui__react-roving-focus.mjs";
import "./patient-utils-YNqCHR6o.mjs";
import "../_libs/radix-ui__react-popover.mjs";
import "../_libs/radix-ui__react-select.mjs";
import "../_libs/radix-ui__number.mjs";
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
import "./session-history-dialog-DtjYYz5K.mjs";
import "../_libs/radix-ui__react-progress.mjs";
import "./scroll-area-B1YvI_Sp.mjs";
import "../_libs/radix-ui__react-scroll-area.mjs";
const PAGE_SIZE = 25;
function PatientsList() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = reactExports.useState([]);
  const [total, setTotal] = reactExports.useState(0);
  const [totalRegistered, setTotalRegistered] = reactExports.useState(0);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [query, setQuery] = reactExports.useState("");
  const [filter, setFilter] = reactExports.useState("all");
  const [page, setPage] = reactExports.useState(0);
  const [openForm, setOpenForm] = reactExports.useState(false);
  const [sessionsOpen, setSessionsOpen] = reactExports.useState(false);
  const [sessionsPatientId, setSessionsPatientId] = reactExports.useState(null);
  const [sessionsPatientName, setSessionsPatientName] = reactExports.useState();
  const load = async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from("patients").select("id, full_name, record_number, phone, active", {
      count: "exact"
    }).eq("tenant_id", profile.tenant_id).order("record_number", {
      ascending: true,
      nullsFirst: false
    });
    if (filter === "active") q = q.eq("active", true);
    if (filter === "inactive") q = q.eq("active", false);
    if (query) {
      const term = query;
      const digits = term.replace(/\D/g, "");
      const parts = [`full_name.ilike.%${term}%`];
      if (digits) parts.push(`cpf.ilike.%${digits}%`, `phone.ilike.%${digits}%`);
      if (/^\d+$/.test(term)) parts.push(`record_number.eq.${term}`);
      q = q.or(parts.join(","));
    }
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const [{
      data,
      count,
      error
    }, {
      count: registeredCount
    }] = await Promise.all([q, supabase.from("patients").select("id", {
      count: "exact",
      head: true
    }).eq("tenant_id", profile.tenant_id)]);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setTotal(count ?? 0);
    setTotalRegistered(registeredCount ?? 0);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, [profile, query, filter, page]);
  const onSearch = () => {
    setPage(0);
    setQuery(search.trim());
  };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const empty = !loading && total === 0 && !query;
  const openSessions = (patientId) => {
    const patient = rows.find((r) => r.id === patientId);
    setSessionsPatientId(patientId);
    setSessionsPatientName(patient?.full_name);
    setSessionsOpen(true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: "Pacientes", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Contatos", description: "Busque pacientes e acesse ficha, prontuário, financeiro e agenda.", actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { onClick: () => setOpenForm(true), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
        "Novo paciente"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { className: "overflow-hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3 border-b bg-muted/30 p-4 lg:flex-row lg:items-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: filter, onValueChange: (v) => {
            setFilter(v);
            setPage(0);
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-full lg:w-48", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos os contatos" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "active", children: "Somente ativos" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "inactive", children: "Somente inativos" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), onKeyDown: (e) => e.key === "Enter" && onSearch(), placeholder: "Digite o nome ou parte do nome para buscar", className: "h-11 pl-10" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { className: "h-11 px-6", onClick: onSearch, children: "Buscar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", className: "h-11 shrink-0", onClick: () => setOpenForm(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
              "Novo paciente"
            ] })
          ] })
        ] }),
        empty ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-16 text-center", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "size-7 text-muted-foreground" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-lg font-semibold", children: "Nenhum paciente cadastrado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "O primeiro cadastro receberá o prontuário nº 1 automaticamente." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { className: "mt-6", onClick: () => setOpenForm(true), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "mr-2 size-4" }),
            "Cadastrar primeiro paciente"
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: "bg-muted/40 hover:bg-muted/40", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-[13rem]", children: "Atalhos" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "w-28 text-center", children: "Nº Prontuário" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Nome" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading && rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, className: "py-10 text-center text-muted-foreground", children: "Carregando pacientes…" }) }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 3, className: "py-10 text-center text-muted-foreground", children: "Nenhum resultado para esta busca" }) }) : rows.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { className: i % 2 === 0 ? "bg-background" : "bg-muted/20", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(PatientShortcuts, { patientId: p.id, phone: p.phone, onSessionsClick: openSessions }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-center font-mono text-sm tabular-nums text-muted-foreground", children: p.record_number ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: p.full_name }),
                !p.active && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: "(inativo)" })
              ] })
            ] }, p.id)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                "Exibindo itens ",
                from,
                " – ",
                to,
                " de ",
                total
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-medium text-foreground", children: [
                totalRegistered,
                " ",
                totalRegistered === 1 ? "paciente cadastrado" : "pacientes cadastrados"
              ] })
            ] }),
            total > PAGE_SIZE && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", size: "sm", disabled: page >= totalPages - 1, onClick: () => setPage((p) => p + 1), children: "Próxima" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PatientFormDialog, { open: openForm, onOpenChange: setOpenForm, onSaved: () => load() }),
    sessionsPatientId && /* @__PURE__ */ jsxRuntimeExports.jsx(PatientSessionsDialog, { open: sessionsOpen, onOpenChange: setSessionsOpen, patientId: sessionsPatientId, patientName: sessionsPatientName })
  ] });
}
export {
  PatientsList as component
};
