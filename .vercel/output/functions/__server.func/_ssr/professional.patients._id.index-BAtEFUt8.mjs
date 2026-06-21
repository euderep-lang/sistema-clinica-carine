import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { d as useNavigate, L as Link } from "../_libs/tanstack__react-router.mjs";
import { d as fmt, f as fmtDate, s as supabase, L as fmtDateFromDate } from "./index.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { aU as Route$4, u as useAuth, D as DashboardShell, B as Button, C as Card, f as CardContent, q as Badge, b as CardHeader, e as CardTitle, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, ai as BILL_STATUS_LABEL, aj as BILL_STATUS_CLASS, af as PAYMENT_LABEL, F as APPOINTMENT_TYPE_LABEL, V as APPOINTMENT_STATUS_LABEL } from "./router-DcWaovdP.mjs";
import { P as Progress, S as SessionCheckoffDialog, a as SessionHistoryDialog } from "./session-history-dialog-DtjYYz5K.mjs";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BH0EiCRX.mjs";
import { a as ageFromBirthDate, b as initials, c as avatarColor, m as maskCPF, d as maskPhone } from "./patient-utils-YNqCHR6o.mjs";
import { P as PatientFormDialog } from "./patient-form-dialog-S2mCVA4Z.mjs";
import "../_libs/jspdf.mjs";
import { ai as ArrowLeft, a8 as Pencil, u as Stethoscope, E as LoaderCircle } from "../_libs/lucide-react.mjs";
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
import "../_libs/radix-ui__react-progress.mjs";
import "./scroll-area-B1YvI_Sp.mjs";
import "../_libs/radix-ui__react-scroll-area.mjs";
import "../_libs/radix-ui__react-tabs.mjs";
const STATUS_LABEL = {
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado"
};
function PatientSessionsContent({
  patientId,
  patientName,
  active = true
}) {
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [checkoffOpen, setCheckoffOpen] = reactExports.useState(false);
  const [checkoffTarget, setCheckoffTarget] = reactExports.useState(null);
  const [historyOpen, setHistoryOpen] = reactExports.useState(false);
  const [historyTarget, setHistoryTarget] = reactExports.useState(null);
  const load = reactExports.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("patient_session_packages").select("id,total_sessions,used_sessions,status,purchased_at,unit_price,services(name)").eq("patient_id", patientId).order("purchased_at", { ascending: false });
    if (error) toast.error(error.message);
    else {
      setRows(
        (data ?? []).map((row) => {
          const svc = row.services;
          const name = Array.isArray(svc) ? svc[0]?.name : svc?.name;
          return {
            id: row.id,
            service_name: name ?? "Procedimento",
            total_sessions: row.total_sessions,
            used_sessions: row.used_sessions,
            status: row.status,
            purchased_at: row.purchased_at,
            unit_price: Number(row.unit_price)
          };
        })
      );
    }
    setLoading(false);
  }, [patientId]);
  reactExports.useEffect(() => {
    if (!active) {
      setCheckoffOpen(false);
      setHistoryOpen(false);
      return;
    }
    void load();
  }, [active, load]);
  const toTarget = (row) => ({
    packageId: row.id,
    patientName: patientName ?? "Paciente",
    serviceName: row.service_name,
    usedSessions: row.used_sessions,
    totalSessions: row.total_sessions
  });
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-10 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-2 size-4 animate-spin" }),
      "Carregando sessões…"
    ] });
  }
  if (rows.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-10 text-center text-sm text-muted-foreground", children: "Nenhum pacote de sessões para este paciente." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-3", children: rows.map((row) => {
      const pct = Math.round(row.used_sessions / row.total_sessions * 100);
      const remaining = row.total_sessions - row.used_sessions;
      return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2 flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-medium", children: row.service_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
              fmt(row.unit_price),
              " ·",
              " ",
              fmtDateFromDate(new Date(row.purchased_at))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: row.status === "active" ? "default" : "secondary", children: STATUS_LABEL[row.status] ?? row.status })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Progress, { value: pct, className: "h-2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
            row.used_sessions,
            " de ",
            row.total_sessions,
            " realizadas",
            row.status === "active" && ` · ${remaining} restantes`
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1", children: [
            row.used_sessions > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                variant: "ghost",
                onClick: () => {
                  setHistoryTarget(toTarget(row));
                  setHistoryOpen(true);
                },
                children: "Histórico"
              }
            ),
            row.status === "active" && row.used_sessions < row.total_sessions && /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                size: "sm",
                variant: "outline",
                onClick: () => {
                  setCheckoffTarget(toTarget(row));
                  setCheckoffOpen(true);
                },
                children: "Dar baixa"
              }
            )
          ] })
        ] })
      ] }) }) }, row.id);
    }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SessionCheckoffDialog,
      {
        open: checkoffOpen,
        onOpenChange: setCheckoffOpen,
        target: checkoffTarget,
        onSuccess: () => void load()
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      SessionHistoryDialog,
      {
        open: historyOpen,
        onOpenChange: setHistoryOpen,
        target: historyTarget
      }
    )
  ] });
}
function Field({
  label,
  value
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: value || "—" })
  ] });
}
function ProfessionalPatientPage() {
  const {
    id
  } = Route$4.useParams();
  const {
    tab
  } = Route$4.useSearch();
  const navigate = useNavigate();
  const {
    profile
  } = useAuth();
  const [patient, setPatient] = reactExports.useState(null);
  const [appts, setAppts] = reactExports.useState([]);
  const [bills, setBills] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [editOpen, setEditOpen] = reactExports.useState(false);
  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast.error("Paciente não encontrado");
      setLoading(false);
      return;
    }
    setPatient(data);
    const {
      data: apptData
    } = await supabase.from("appointments").select("id,date,start_time,status,type").eq("patient_id", id).eq("professional_id", profile.id).order("date", {
      ascending: false
    });
    setAppts(apptData ?? []);
    const {
      data: billData
    } = await supabase.from("bills_receivable").select("id,description,amount,paid_amount,due_date,paid_date,payment_method,status").eq("patient_id", id).or(`professional_id.eq.${profile.id},professional_id.is.null`).order("due_date", {
      ascending: false
    });
    setBills(billData ?? []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    void load();
  }, [id, profile]);
  const financialSummary = reactExports.useMemo(() => {
    const total = bills.reduce((s, b) => s + Number(b.amount), 0);
    const paid = bills.reduce((s, b) => s + Number(b.paid_amount), 0);
    const pending = total - paid;
    return {
      total,
      paid,
      pending
    };
  }, [bills]);
  if (loading || !patient) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardShell, { title: "Paciente", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "py-16 text-center text-muted-foreground", children: "Carregando…" }) });
  }
  const age = patient.birth_date ? ageFromBirthDate(patient.birth_date) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(DashboardShell, { title: patient.full_name, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "ghost", size: "sm", asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/professional/patients", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { className: "mr-2 size-4" }),
        "Voltar aos pacientes"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "flex flex-col gap-4 p-6 md:flex-row md:items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid size-20 shrink-0 place-items-center rounded-full text-2xl font-bold text-white ${avatarColor(patient.full_name)}`, children: initials(patient.full_name) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold", children: patient.full_name }),
            patient.record_number != null && /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { variant: "outline", className: "font-mono tabular-nums", children: [
              "Prontuário ",
              patient.record_number
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground", children: [
            age !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              age,
              " anos"
            ] }),
            patient.cpf && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "CPF: ",
              maskCPF(patient.cpf)
            ] }),
            patient.phone && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: maskPhone(patient.phone) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { variant: "outline", onClick: () => setEditOpen(true), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-2 size-4" }),
            "Editar ficha"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { asChild: true, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/professional/patients/$id/record", params: {
            id
          }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Stethoscope, { className: "mr-2 size-4" }),
            "Abrir prontuário"
          ] }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(Tabs, { value: tab, onValueChange: (value) => navigate({
        to: "/professional/patients/$id",
        params: {
          id
        },
        search: {
          tab: value
        },
        replace: true
      }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(TabsList, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "dados", children: "Cadastro" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "financeiro", children: "Financeiro" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "consultas", children: "Agendamentos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(TabsTrigger, { value: "sessoes", children: "Sessões" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "dados", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Dados cadastrais" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", onClick: () => setEditOpen(true), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "mr-2 size-4" }),
              "Editar"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(CardContent, { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nome", value: patient.full_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CPF", value: patient.cpf ? maskCPF(patient.cpf) : null }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "RG", value: patient.rg }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Nascimento", value: patient.birth_date }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Sexo", value: patient.gender }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Como nos conheceu", value: patient.how_did_you_find_us }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Telefone", value: patient.phone ? maskPhone(patient.phone) : null }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "E-mail", value: patient.email }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Endereço", value: [patient.address_street, patient.address_number, patient.address_complement, patient.address_neighborhood, patient.address_city, patient.address_state].filter(Boolean).join(", ") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "CEP", value: patient.address_zip }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Tipo sanguíneo", value: patient.blood_type }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Convênio", value: patient.health_insurance }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Carteirinha", value: patient.health_insurance_number }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Alergias", value: patient.allergies }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Contato emergência", value: patient.emergency_contact_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Telefone emergência", value: patient.emergency_contact_phone ? maskPhone(patient.emergency_contact_phone) : null }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Observações", value: patient.notes }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "financeiro", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Total lançado" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "text-2xl font-bold", children: fmt(financialSummary.total) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Recebido" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "text-2xl font-bold text-emerald-600", children: fmt(financialSummary.paid) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Pendente" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "text-2xl font-bold text-amber-600", children: fmt(financialSummary.pending) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Card, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Descrição" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Vencimento" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Valor" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Pago" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: bills.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 5, className: "py-10 text-center text-muted-foreground", children: "Nenhuma cobrança para este paciente" }) }) : bills.map((bill) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { className: "font-medium", children: bill.description }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmtDate(bill.due_date) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(bill.amount) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmt(bill.paid_amount) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(TableCell, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", className: BILL_STATUS_CLASS[bill.status], children: BILL_STATUS_LABEL[bill.status] ?? bill.status }),
                bill.payment_method && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: PAYMENT_LABEL[bill.payment_method] ?? bill.payment_method })
              ] })
            ] }, bill.id)) })
          ] }) }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "consultas", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Card, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(CardTitle, { className: "text-base", children: "Agendamentos deste paciente" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(Table, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Data" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Horário" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Tipo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(TableBody, { children: appts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(TableRow, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { colSpan: 4, className: "py-10 text-center text-muted-foreground", children: "Nenhum agendamento encontrado" }) }) : appts.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsxs(TableRow, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: fmtDate(a.date) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: a.start_time?.slice(0, 5) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(TableCell, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { variant: "outline", children: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—" }) })
            ] }, a.id)) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(TabsContent, { value: "sessoes", children: /* @__PURE__ */ jsxRuntimeExports.jsx(PatientSessionsContent, { patientId: id, patientName: patient.full_name, active: tab === "sessoes" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PatientFormDialog, { open: editOpen, onOpenChange: setEditOpen, initial: patient, onSaved: () => void load() })
  ] });
}
export {
  ProfessionalPatientPage as component
};
