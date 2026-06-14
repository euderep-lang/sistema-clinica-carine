import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, D as DashboardShell, B as Button, C as Card, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, I as Input, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell } from "./router-uS_mSfDy.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PatientShortcuts } from "./patient-shortcuts-CdoNqcPt.js";
import { P as PatientSessionsDialog } from "./patient-sessions-dialog-DuhFMaOQ.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { P as PatientFormDialog } from "./patient-form-dialog-sC-z7-6J.js";
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
import "./letterhead-pdf-4K2s0GWH.js";
import "./agenda-utils-DsE3sZeK.js";
import "./patient-sessions-content-Bk4RcL6f.js";
import "./progress-DAD4twrC.js";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-progress";
import "@supabase/supabase-js";
const PAGE_SIZE = 25;
function PatientsList() {
  const {
    profile
  } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionsPatientId, setSessionsPatientId] = useState(null);
  const [sessionsPatientName, setSessionsPatientName] = useState();
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
  useEffect(() => {
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
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Pacientes", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: "Contatos", description: "Busque pacientes e acesse ficha, prontuário, financeiro e agenda.", actions: /* @__PURE__ */ jsxs(Button, { onClick: () => setOpenForm(true), children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Novo paciente"
      ] }) }),
      /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 border-b bg-muted/30 p-4 lg:flex-row lg:items-center", children: [
          /* @__PURE__ */ jsxs(Select, { value: filter, onValueChange: (v) => {
            setFilter(v);
            setPage(0);
          }, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-full lg:w-48", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos os contatos" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "active", children: "Somente ativos" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "inactive", children: "Somente inativos" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-1 gap-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
              /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), onKeyDown: (e) => e.key === "Enter" && onSearch(), placeholder: "Digite o nome ou parte do nome para buscar", className: "h-11 pl-10" })
            ] }),
            /* @__PURE__ */ jsx(Button, { className: "h-11 px-6", onClick: onSearch, children: "Buscar" })
          ] })
        ] }),
        empty ? /* @__PURE__ */ jsxs("div", { className: "px-4 py-16 text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted", children: /* @__PURE__ */ jsx(Users, { className: "size-7 text-muted-foreground" }) }),
          /* @__PURE__ */ jsx("p", { className: "font-display text-lg font-semibold", children: "Nenhum paciente cadastrado" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "O primeiro cadastro receberá o prontuário nº 1 automaticamente." }),
          /* @__PURE__ */ jsxs(Button, { className: "mt-6", onClick: () => setOpenForm(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            "Cadastrar primeiro paciente"
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/40 hover:bg-muted/40", children: [
              /* @__PURE__ */ jsx(TableHead, { className: "w-[13rem]", children: "Atalhos" }),
              /* @__PURE__ */ jsx(TableHead, { className: "w-28 text-center", children: "Nº Prontuário" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Nome" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: loading && rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 3, className: "py-10 text-center text-muted-foreground", children: "Carregando pacientes…" }) }) : rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 3, className: "py-10 text-center text-muted-foreground", children: "Nenhum resultado para esta busca" }) }) : rows.map((p, i) => /* @__PURE__ */ jsxs(TableRow, { className: i % 2 === 0 ? "bg-background" : "bg-muted/20", children: [
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(PatientShortcuts, { patientId: p.id, phone: p.phone, onSessionsClick: openSessions }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-center font-mono text-sm tabular-nums text-muted-foreground", children: p.record_number ?? "—" }),
              /* @__PURE__ */ jsxs(TableCell, { children: [
                /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: p.full_name }),
                !p.active && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: "(inativo)" })
              ] })
            ] }, p.id)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-1", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                "Exibindo itens ",
                from,
                " – ",
                to,
                " de ",
                total
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "font-medium text-foreground", children: [
                totalRegistered,
                " ",
                totalRegistered === 1 ? "paciente cadastrado" : "pacientes cadastrados"
              ] })
            ] }),
            total > PAGE_SIZE && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
              /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page >= totalPages - 1, onClick: () => setPage((p) => p + 1), children: "Próxima" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(PatientFormDialog, { open: openForm, onOpenChange: setOpenForm, onSaved: () => load() }),
    sessionsPatientId && /* @__PURE__ */ jsx(PatientSessionsDialog, { open: sessionsOpen, onOpenChange: setSessionsOpen, patientId: sessionsPatientId, patientName: sessionsPatientName })
  ] });
}
export {
  PatientsList as component
};
