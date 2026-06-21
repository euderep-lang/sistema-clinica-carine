import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Eye } from "lucide-react";
import { u as useAuth, D as DashboardShell, C as Card, f as CardContent, I as Input, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, q as Badge, B as Button } from "./router-D_mhnWOa.js";
import { P as PageHeader } from "./page-header-BNsdM97h.js";
import { s as supabase, f as fmtDate } from "../server.js";
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
function ProfessionalRecordsPage() {
  const {
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoading(true);
      const {
        data
      } = await supabase.from("medical_records").select("id,date,chief_complaint,diagnosis,icd10_code,patient_id,patients(full_name)").eq("professional_id", profile.id).order("date", {
        ascending: false
      }).limit(200);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [profile]);
  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.patients?.full_name?.toLowerCase().includes(q) ?? false) || (r.chief_complaint?.toLowerCase().includes(q) ?? false) || (r.diagnosis?.toLowerCase().includes(q) ?? false) || (r.icd10_code?.toLowerCase().includes(q) ?? false);
  });
  return /* @__PURE__ */ jsx(DashboardShell, { title: "Prontuários", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(PageHeader, { title: "Prontuários", description: "Atendimentos registrados por você. Abra o prontuário completo do paciente." }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }),
      /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar por paciente, queixa, diagnóstico ou CID…", className: "pl-9" })
    ] }) }) }),
    /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Paciente" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Queixa principal" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Diagnóstico" }),
        /* @__PURE__ */ jsx(TableHead, { children: "CID" }),
        /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: loading ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Carregando…" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 6, className: "py-10 text-center text-muted-foreground", children: "Nenhum prontuário encontrado." }) }) : filtered.map((r) => /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.date) }),
        /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: r.patients?.full_name ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { className: "max-w-[200px] truncate text-sm text-muted-foreground", children: r.chief_complaint ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { className: "max-w-[200px] truncate text-sm", children: r.diagnosis ?? "—" }),
        /* @__PURE__ */ jsx(TableCell, { children: r.icd10_code ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: r.icd10_code }) : "—" }),
        /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => navigate({
          to: "/professional/patients/$id/record",
          params: {
            id: r.patient_id
          }
        }), children: [
          /* @__PURE__ */ jsx(Eye, { className: "mr-1 size-4" }),
          "Abrir"
        ] }) })
      ] }, r.id)) })
    ] }) }) })
  ] }) });
}
export {
  ProfessionalRecordsPage as component
};
