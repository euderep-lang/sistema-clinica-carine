import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Pencil, Stethoscope } from "lucide-react";
import { s as supabase, d as fmt, L as fmtDateFromDate, f as fmtDate } from "../server.js";
import { toast } from "sonner";
import { C as Card, f as CardContent, q as Badge, B as Button, aU as Route, u as useAuth, D as DashboardShell, b as CardHeader, e as CardTitle, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, ai as BILL_STATUS_LABEL, aj as BILL_STATUS_CLASS, af as PAYMENT_LABEL, F as APPOINTMENT_TYPE_LABEL, V as APPOINTMENT_STATUS_LABEL } from "./router-D_mhnWOa.js";
import { P as Progress, S as SessionCheckoffDialog, a as SessionHistoryDialog } from "./session-history-dialog-UeGvH_Ms.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-C9JcLYqK.js";
import { d as ageFromBirthDate, i as initials, a as avatarColor, m as maskCPF, b as maskPhone } from "./patient-utils-YNqCHR6o.js";
import { P as PatientFormDialog } from "./patient-form-dialog-BB5M7Vp9.js";
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
import "@radix-ui/react-popover";
import "@radix-ui/react-select";
import "@radix-ui/react-label";
import "cmdk";
import "@radix-ui/react-switch";
import "@radix-ui/react-checkbox";
import "jspdf";
import "./letterhead-pdf-8X66Bk4t.js";
import "@radix-ui/react-progress";
import "./scroll-area-CZMombI1.js";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-tabs";
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkoffOpen, setCheckoffOpen] = useState(false);
  const [checkoffTarget, setCheckoffTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState(null);
  const load = useCallback(async () => {
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
  useEffect(() => {
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
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-10 text-sm text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "mr-2 size-4 animate-spin" }),
      "Carregando sessões…"
    ] });
  }
  if (rows.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "py-10 text-center text-sm text-muted-foreground", children: "Nenhum pacote de sessões para este paciente." });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("ul", { className: "space-y-3", children: rows.map((row) => {
      const pct = Math.round(row.used_sessions / row.total_sessions * 100);
      const remaining = row.total_sessions - row.used_sessions;
      return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium", children: row.service_name }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              fmt(row.unit_price),
              " ·",
              " ",
              fmtDateFromDate(new Date(row.purchased_at))
            ] })
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: row.status === "active" ? "default" : "secondary", children: STATUS_LABEL[row.status] ?? row.status })
        ] }),
        /* @__PURE__ */ jsx(Progress, { value: pct, className: "h-2" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            row.used_sessions,
            " de ",
            row.total_sessions,
            " realizadas",
            row.status === "active" && ` · ${remaining} restantes`
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
            row.used_sessions > 0 && /* @__PURE__ */ jsx(
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
            row.status === "active" && row.used_sessions < row.total_sessions && /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsx(
      SessionCheckoffDialog,
      {
        open: checkoffOpen,
        onOpenChange: setCheckoffOpen,
        target: checkoffTarget,
        onSuccess: () => void load()
      }
    ),
    /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: value || "—" })
  ] });
}
function ProfessionalPatientPage() {
  const {
    id
  } = Route.useParams();
  const {
    tab
  } = Route.useSearch();
  const navigate = useNavigate();
  const {
    profile
  } = useAuth();
  const [patient, setPatient] = useState(null);
  const [appts, setAppts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
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
  useEffect(() => {
    void load();
  }, [id, profile]);
  const financialSummary = useMemo(() => {
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
    return /* @__PURE__ */ jsx(DashboardShell, { title: "Paciente", children: /* @__PURE__ */ jsx("p", { className: "py-16 text-center text-muted-foreground", children: "Carregando…" }) });
  }
  const age = patient.birth_date ? ageFromBirthDate(patient.birth_date) : null;
  return /* @__PURE__ */ jsxs(DashboardShell, { title: patient.full_name, children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", asChild: true, children: /* @__PURE__ */ jsxs(Link, { to: "/professional/patients", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "mr-2 size-4" }),
        "Voltar aos pacientes"
      ] }) }),
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col gap-4 p-6 md:flex-row md:items-start", children: [
        /* @__PURE__ */ jsx("div", { className: `grid size-20 shrink-0 place-items-center rounded-full text-2xl font-bold text-white ${avatarColor(patient.full_name)}`, children: initials(patient.full_name) }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: patient.full_name }),
            patient.record_number != null && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "font-mono tabular-nums", children: [
              "Prontuário ",
              patient.record_number
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground", children: [
            age !== null && /* @__PURE__ */ jsxs("span", { children: [
              age,
              " anos"
            ] }),
            patient.cpf && /* @__PURE__ */ jsxs("span", { children: [
              "CPF: ",
              maskCPF(patient.cpf)
            ] }),
            patient.phone && /* @__PURE__ */ jsx("span", { children: maskPhone(patient.phone) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => setEditOpen(true), children: [
            /* @__PURE__ */ jsx(Pencil, { className: "mr-2 size-4" }),
            "Editar ficha"
          ] }),
          /* @__PURE__ */ jsx(Button, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { to: "/professional/patients/$id/record", params: {
            id
          }, children: [
            /* @__PURE__ */ jsx(Stethoscope, { className: "mr-2 size-4" }),
            "Abrir prontuário"
          ] }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Tabs, { value: tab, onValueChange: (value) => navigate({
        to: "/professional/patients/$id",
        params: {
          id
        },
        search: {
          tab: value
        },
        replace: true
      }), children: [
        /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "dados", children: "Cadastro" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "financeiro", children: "Financeiro" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "consultas", children: "Agendamentos" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "sessoes", children: "Sessões" })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "dados", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Dados cadastrais" }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => setEditOpen(true), children: [
              /* @__PURE__ */ jsx(Pencil, { className: "mr-2 size-4" }),
              "Editar"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(CardContent, { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
            /* @__PURE__ */ jsx(Field, { label: "Nome", value: patient.full_name }),
            /* @__PURE__ */ jsx(Field, { label: "CPF", value: patient.cpf ? maskCPF(patient.cpf) : null }),
            /* @__PURE__ */ jsx(Field, { label: "RG", value: patient.rg }),
            /* @__PURE__ */ jsx(Field, { label: "Nascimento", value: patient.birth_date }),
            /* @__PURE__ */ jsx(Field, { label: "Sexo", value: patient.gender }),
            /* @__PURE__ */ jsx(Field, { label: "Como nos conheceu", value: patient.how_did_you_find_us }),
            /* @__PURE__ */ jsx(Field, { label: "Telefone", value: patient.phone ? maskPhone(patient.phone) : null }),
            /* @__PURE__ */ jsx(Field, { label: "E-mail", value: patient.email }),
            /* @__PURE__ */ jsx(Field, { label: "Endereço", value: [patient.address_street, patient.address_number, patient.address_complement, patient.address_neighborhood, patient.address_city, patient.address_state].filter(Boolean).join(", ") }),
            /* @__PURE__ */ jsx(Field, { label: "CEP", value: patient.address_zip }),
            /* @__PURE__ */ jsx(Field, { label: "Tipo sanguíneo", value: patient.blood_type }),
            /* @__PURE__ */ jsx(Field, { label: "Convênio", value: patient.health_insurance }),
            /* @__PURE__ */ jsx(Field, { label: "Carteirinha", value: patient.health_insurance_number }),
            /* @__PURE__ */ jsx(Field, { label: "Alergias", value: patient.allergies }),
            /* @__PURE__ */ jsx(Field, { label: "Contato emergência", value: patient.emergency_contact_name }),
            /* @__PURE__ */ jsx(Field, { label: "Telefone emergência", value: patient.emergency_contact_phone ? maskPhone(patient.emergency_contact_phone) : null }),
            /* @__PURE__ */ jsx("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsx(Field, { label: "Observações", value: patient.notes }) })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "financeiro", children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [
            /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Total lançado" }) }),
              /* @__PURE__ */ jsx(CardContent, { className: "text-2xl font-bold", children: fmt(financialSummary.total) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Recebido" }) }),
              /* @__PURE__ */ jsx(CardContent, { className: "text-2xl font-bold text-emerald-600", children: fmt(financialSummary.paid) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { children: [
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Pendente" }) }),
              /* @__PURE__ */ jsx(CardContent, { className: "text-2xl font-bold text-amber-600", children: fmt(financialSummary.pending) })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Descrição" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Vencimento" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Valor" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Pago" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: bills.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 5, className: "py-10 text-center text-muted-foreground", children: "Nenhuma cobrança para este paciente" }) }) : bills.map((bill) => /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { className: "font-medium", children: bill.description }),
              /* @__PURE__ */ jsx(TableCell, { children: fmtDate(bill.due_date) }),
              /* @__PURE__ */ jsx(TableCell, { children: fmt(bill.amount) }),
              /* @__PURE__ */ jsx(TableCell, { children: fmt(bill.paid_amount) }),
              /* @__PURE__ */ jsxs(TableCell, { children: [
                /* @__PURE__ */ jsx(Badge, { variant: "outline", className: BILL_STATUS_CLASS[bill.status], children: BILL_STATUS_LABEL[bill.status] ?? bill.status }),
                bill.payment_method && /* @__PURE__ */ jsx("span", { className: "ml-2 text-xs text-muted-foreground", children: PAYMENT_LABEL[bill.payment_method] ?? bill.payment_method })
              ] })
            ] }, bill.id)) })
          ] }) }) })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "consultas", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Agendamentos deste paciente" }) }),
          /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Horário" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Tipo" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: appts.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "py-10 text-center text-muted-foreground", children: "Nenhum agendamento encontrado" }) }) : appts.map((a) => /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { children: fmtDate(a.date) }),
              /* @__PURE__ */ jsx(TableCell, { children: a.start_time?.slice(0, 5) }),
              /* @__PURE__ */ jsx(TableCell, { children: APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", children: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—" }) })
            ] }, a.id)) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "sessoes", children: /* @__PURE__ */ jsx(PatientSessionsContent, { patientId: id, patientName: patient.full_name, active: tab === "sessoes" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(PatientFormDialog, { open: editOpen, onOpenChange: setEditOpen, initial: patient, onSaved: () => void load() })
  ] });
}
export {
  ProfessionalPatientPage as component
};
