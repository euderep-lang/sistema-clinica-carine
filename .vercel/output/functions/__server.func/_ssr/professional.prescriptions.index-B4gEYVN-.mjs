import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { s as supabase, P as fmtDateTimeFromDate } from "./index.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useAuth, D as DashboardShell, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, B as Button, C as Card, f as CardContent, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge } from "./router-DcWaovdP.mjs";
import "../_libs/jspdf.mjs";
import { P as Plus, aM as PenLine, ae as FileDown, aE as Copy, aN as FilePlusCorner } from "../_libs/lucide-react.mjs";
import "node:crypto";
import "../_libs/supabase__supabase-js.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
import "../_libs/tanstack__query-core.mjs";
import "../_libs/tanstack__react-query.mjs";
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
  if (t === "controlada") return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-red-100 text-red-700 hover:bg-red-100", children: "Controlada" });
  if (t === "especial_2vias") return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-sky-100 text-sky-800 hover:bg-sky-100", children: "Especial 2 Vias" });
  if (t === "especial") return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-orange-100 text-orange-700 hover:bg-orange-100", children: "Especial" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-blue-100 text-blue-700 hover:bg-blue-100", children: "Simples" });
}
function statusBadge(s) {
  if (s === "finalized") return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-green-100 text-green-700 hover:bg-green-100", children: "Finalizada" });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "secondary", children: "Rascunho" });
}
function signatureBadge(row) {
  if (row.signed_at) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: "bg-emerald-600 text-white hover:bg-emerald-600", children: "Assinada" });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: "text-muted-foreground", children: "Não assinada" });
}
function PrescriptionsList() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [page, setPage] = reactExports.useState(0);
  const [total, setTotal] = reactExports.useState(0);
  const [type, setType] = reactExports.useState("all");
  const [status, setStatus] = reactExports.useState("all");
  const [from, setFrom] = reactExports.useState("");
  const [to, setTo] = reactExports.useState("");
  const [q, setQ] = reactExports.useState("");
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
  reactExports.useEffect(() => {
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Receituário", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 items-end justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 items-end", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { placeholder: "Buscar por paciente", value: q, onChange: (e) => {
          setPage(0);
          setQ(e.target.value);
        }, className: "w-56" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: type, onValueChange: (v) => {
          setPage(0);
          setType(v);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-44", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todos os tipos" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "simples", children: "Simples" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "controlada", children: "Controlada" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "especial", children: "Especial" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "especial_2vias", children: "Especial 2 Vias" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: status, onValueChange: (v) => {
          setPage(0);
          setStatus(v);
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "w-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "all", children: "Todas as situações" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "draft", children: "Rascunho" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "finalized", children: "Finalizada" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: from, onChange: (e) => {
          setPage(0);
          setFrom(e.target.value);
        }, className: "w-40" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Input, { type: "date", value: to, onChange: (e) => {
          setPage(0);
          setTo(e.target.value);
        }, className: "w-40" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/professional/prescriptions/new", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4 mr-2" }),
        "Nova Receita"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Data e hora" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Paciente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Assinatura" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { className: "text-right", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-12", children: "Carregando..." }) }) : rows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 6, className: "text-center text-muted-foreground py-12", children: "Nenhuma receita emitida ainda" }) }) : rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "whitespace-nowrap", children: formatRxGeneratedAt(r) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium", children: r.patients?.full_name ?? "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: typeBadge(r.type) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: statusBadge(r.status) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: signatureBadge(r) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 justify-end", children: [
          r.status === "draft" ? /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", onClick: () => editDraft(r.id), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { className: "h-4 w-4 mr-1" }),
            "Continuar"
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => openPdf(r.pdf_url), disabled: !r.pdf_url, children: /* @__PURE__ */ jsxRuntimeExports.jsx(FileDown, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => duplicate(r.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "ghost", onClick: () => navigate({
            to: "/professional/prescriptions/new",
            search: {
              patient_id: r.patient_id
            }
          }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(FilePlusCorner, { className: "h-4 w-4" }) })
        ] }) })
      ] }, r.id)) })
    ] }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        total,
        " receitas"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", disabled: page === 0, onClick: () => setPage((p) => p - 1), children: "Anterior" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "px-2 py-1", children: [
          "Página ",
          page + 1,
          " de ",
          pages
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", disabled: page + 1 >= pages, onClick: () => setPage((p) => p + 1), children: "Próxima" })
      ] })
    ] })
  ] }) });
}
export {
  PrescriptionsList as component
};
