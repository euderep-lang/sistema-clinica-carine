import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { s as supabase, P as fmtDateTimeFromDate } from "../server.js";
import { useNavigate, Link } from "@tanstack/react-router";
import { Plus, PenLine, FileDown, Copy, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, D as DashboardShell, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, B as Button, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge } from "./router-D_mhnWOa.js";
import "node:crypto";
import "@supabase/supabase-js";
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
import "./letterhead-pdf-8X66Bk4t.js";
function formatRxGeneratedAt(row) {
  const iso = row.status === "finalized" ? row.signed_at ?? row.updated_at : row.created_at;
  return fmtDateTimeFromDate(new Date(iso), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
const PAGE_SIZE = 20;
function typeBadge(t) {
  if (t === "controlada") return /* @__PURE__ */ jsx(Badge, { className: "bg-red-100 text-red-700 hover:bg-red-100", children: "Controlada" });
  if (t === "especial_2vias") return /* @__PURE__ */ jsx(Badge, { className: "bg-sky-100 text-sky-800 hover:bg-sky-100", children: "Especial 2 Vias" });
  if (t === "especial") return /* @__PURE__ */ jsx(Badge, { className: "bg-orange-100 text-orange-700 hover:bg-orange-100", children: "Especial" });
  return /* @__PURE__ */ jsx(Badge, { className: "bg-blue-100 text-blue-700 hover:bg-blue-100", children: "Simples" });
}
function statusBadge(s) {
  if (s === "finalized") return /* @__PURE__ */ jsx(Badge, { className: "bg-green-100 text-green-700 hover:bg-green-100", children: "Finalizada" });
  return /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "Rascunho" });
}
function signatureBadge(row) {
  if (row.signed_at) {
    return /* @__PURE__ */ jsx(Badge, { className: "bg-emerald-600 text-white hover:bg-emerald-600", children: "Assinada" });
  }
  return /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-muted-foreground", children: "Não assinada" });
}
function PrescriptionsList() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const load = async () => {
    setLoading(true);
    let query = supabase.from("prescriptions").select("id, date, type, status, patient_id, pdf_url, created_at, updated_at, signed_at, patients!inner(full_name)", {
      count: "exact"
    }).eq("professional_id", profile.id).order("updated_at", {
      ascending: false
    }).order("created_at", {
      ascending: false
    }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (type !== "all") query = query.eq("type", type);
    if (status !== "all") query = query.eq("status", status);
    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (q) query = query.ilike("patients.full_name", `%${q}%`);
    const {
      data,
      count,
      error
    } = await query;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [page, type, status, from, to, q]);
  const openPdf = async (path) => {
    if (!path) {
      toast.error("Documento não disponível");
      return;
    }
    const {
      data,
      error
    } = await supabase.storage.from("prescriptions").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Erro ao abrir documento");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };
  const duplicate = async (id) => {
    navigate({
      to: "/professional/prescriptions/new",
      search: {
        duplicate: id
      }
    });
  };
  const editDraft = (id) => {
    navigate({
      to: "/professional/prescriptions/new",
      search: {
        edit: id
      }
    });
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!profile) return null;
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Receituário", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
        /* @__PURE__ */ jsx(Input, { placeholder: "Buscar por paciente", value: q, onChange: (e) => {
          setPage(0);
          setQ(e.target.value);
        }, className: "w-56" }),
        /* @__PURE__ */ jsxs(Select, { value: type, onValueChange: (v) => {
          setPage(0);
          setType(v);
        }, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos os tipos" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "simples", children: "Simples" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "controlada", children: "Controlada" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "especial", children: "Especial" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "especial_2vias", children: "Especial 2 Vias" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: (v) => {
          setPage(0);
          setStatus(v);
        }, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas as situações" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "draft", children: "Rascunho" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "finalized", children: "Finalizada" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: from, onChange: (e) => {
          setPage(0);
          setFrom(e.target.value);
        }, className: "w-40" }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: to, onChange: (e) => {
          setPage(0);
          setTo(e.target.value);
        }, className: "w-40" })
      ] }),
      /* @__PURE__ */ jsx(Button, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { to: "/professional/prescriptions/new", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-2" }),
        "Nova Receita"
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Data e hora" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Tipo" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Assinatura" }),
        /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-12", children: "Carregando..." }) }) : rows.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-12", children: "Nenhuma receita emitida ainda" }) }) : rows.map((r) => /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableCell, { className: "whitespace-nowrap", children: formatRxGeneratedAt(r) }),
        /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: r.patients?.full_name ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { children: typeBadge(r.type) }),
        /* @__PURE__ */ jsx(TableCell, { children: statusBadge(r.status) }),
        /* @__PURE__ */ jsx(TableCell, { children: signatureBadge(r) }),
        /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-1 justify-end", children: [
          r.status === "draft" ? /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => editDraft(r.id), children: [
            /* @__PURE__ */ jsx(PenLine, { className: "h-4 w-4 mr-1" }),
            "Continuar"
          ] }) : /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => openPdf(r.pdf_url), disabled: !r.pdf_url, children: /* @__PURE__ */ jsx(FileDown, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => duplicate(r.id), children: /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => navigate({
            to: "/professional/prescriptions/new",
            search: {
              patient_id: r.patient_id
            }
          }), children: /* @__PURE__ */ jsx(FilePlus2, { className: "h-4 w-4" }) })
        ] }) })
      ] }, r.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        total,
        " receitas"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: page === 0, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
        /* @__PURE__ */ jsxs("span", { className: "px-2 py-1", children: [
          "Página ",
          page + 1,
          " de ",
          pages
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", disabled: page + 1 >= pages, onClick: () => setPage((p) => p + 1), children: "Próxima" })
      ] })
    ] })
  ] }) });
}
export {
  PrescriptionsList as component
};
