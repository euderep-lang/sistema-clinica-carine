import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { u as useAuth, D as DashboardShell, B as Button, C as Card, I as Input, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell } from "./router-DKQJQoSP.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { P as PatientShortcuts } from "./patient-shortcuts-Dc0NBC43.js";
import { P as PatientFormDialog } from "./patient-form-dialog-CDwCSHp-.js";
import { s as supabase } from "../server.js";
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
import "node:crypto";
import "@supabase/supabase-js";
const PAGE_SIZE = 25;
function ProfessionalPatients() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const load = async () => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from("patients").select("id, full_name, record_number, phone", {
      count: "exact"
    }).eq("tenant_id", profile.tenant_id).eq("active", true).order("record_number", {
      ascending: true,
      nullsFirst: false
    });
    if (query) {
      const term = query;
      const digits = term.replace(/\D/g, "");
      const parts = [`full_name.ilike.%${term}%`];
      if (digits) parts.push(`cpf.ilike.%${digits}%`, `phone.ilike.%${digits}%`);
      if (/^\d+$/.test(term)) parts.push(`record_number.eq.${term}`);
      q = q.or(parts.join(","));
    }
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const {
      data,
      count,
      error
    } = await q;
    if (error) setRows([]);
    else {
      setRows(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, [profile, query, page]);
  const onSearch = () => {
    setPage(0);
    setQuery(search.trim());
  };
  const openSessions = (patientId) => {
    navigate({
      to: "/professional/patients/$id",
      params: {
        id: patientId
      },
      search: {
        tab: "sessoes"
      }
    });
  };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  const empty = !loading && total === 0 && !query;
  return /* @__PURE__ */ jsxs(DashboardShell, { title: "Meus Pacientes", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsx(PageHeader, { title: "Meus Pacientes", description: "Busque pacientes e acesse ficha, prontuário, sessões e agenda.", actions: /* @__PURE__ */ jsxs(Button, { onClick: () => setOpenForm(true), children: [
        /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
        "Novo paciente"
      ] }) }),
      /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3 border-b bg-muted/30 p-4 lg:flex-row lg:items-center", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-1 gap-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
            /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
            /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), onKeyDown: (e) => e.key === "Enter" && onSearch(), placeholder: "Digite o nome ou parte do nome para buscar", className: "h-11 pl-10" })
          ] }),
          /* @__PURE__ */ jsx(Button, { className: "h-11 px-6", onClick: onSearch, children: "Buscar" }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", className: "h-11 shrink-0", onClick: () => setOpenForm(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            "Novo paciente"
          ] })
        ] }) }),
        empty ? /* @__PURE__ */ jsxs("div", { className: "px-4 py-16 text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted", children: /* @__PURE__ */ jsx(Users, { className: "size-7 text-muted-foreground" }) }),
          /* @__PURE__ */ jsx("p", { className: "font-display text-lg font-semibold", children: "Nenhum paciente ainda" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Cadastre pacientes da clínica ou busque na lista abaixo." }),
          /* @__PURE__ */ jsxs(Button, { className: "mt-6", onClick: () => setOpenForm(true), children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 size-4" }),
            "Cadastrar paciente"
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { className: "bg-muted/40 hover:bg-muted/40", children: [
              /* @__PURE__ */ jsx(TableHead, { className: "w-[13rem]", children: "Atalhos" }),
              /* @__PURE__ */ jsx(TableHead, { className: "w-28 text-center", children: "Nº Prontuário" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Nome" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: loading && rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 3, className: "py-10 text-center text-muted-foreground", children: "Carregando pacientes…" }) }) : rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 3, className: "py-10 text-center text-muted-foreground", children: "Nenhum resultado para esta busca" }) }) : rows.map((p, i) => /* @__PURE__ */ jsxs(TableRow, { className: i % 2 === 0 ? "bg-background" : "bg-muted/20", children: [
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(PatientShortcuts, { variant: "professional", patientId: p.id, phone: p.phone, onSessionsClick: openSessions }) }),
              /* @__PURE__ */ jsx(TableCell, { className: "text-center font-mono text-sm tabular-nums text-muted-foreground", children: p.record_number ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground", children: p.full_name }) })
            ] }, p.id)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "Exibindo itens ",
              from,
              " – ",
              to,
              " de ",
              total
            ] }),
            total > PAGE_SIZE && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page === 0, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
              /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: page >= totalPages - 1, onClick: () => setPage((p) => p + 1), children: "Próxima" })
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(PatientFormDialog, { open: openForm, onOpenChange: setOpenForm, onSaved: (id) => {
      void load();
      navigate({
        to: "/professional/patients/$id",
        params: {
          id
        }
      });
    } })
  ] });
}
export {
  ProfessionalPatients as component
};
