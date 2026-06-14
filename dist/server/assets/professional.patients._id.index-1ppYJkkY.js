import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { P as PatientSessionsContent } from "./patient-sessions-content-Bk4RcL6f.js";
import { toast } from "sonner";
import { aM as Route, u as useAuth, D as DashboardShell, B as Button, C as Card, c as CardContent, m as Badge, a as CardHeader, b as CardTitle, W as fmt, E as Table, F as TableHeader, G as TableRow, H as TableHead, J as TableBody, M as TableCell, X as fmtDate, _ as BILL_STATUS_LABEL, a1 as BILL_STATUS_CLASS, a0 as PAYMENT_LABEL, x as APPOINTMENT_TYPE_LABEL, N as APPOINTMENT_STATUS_LABEL } from "./router-uS_mSfDy.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BnzxvlM-.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { d as ageFromBirthDate, i as initials, a as avatarColor, m as maskCPF, b as maskPhone } from "./patient-utils-YNqCHR6o.js";
import "./progress-DAD4twrC.js";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-progress";
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
import "./letterhead-pdf-4K2s0GWH.js";
import "@radix-ui/react-tabs";
import "@supabase/supabase-js";
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
    } = await supabase.from("bills_receivable").select("id,description,amount,paid_amount,due_date,paid_date,payment_method,status").eq("patient_id", id).eq("professional_id", profile.id).order("due_date", {
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
  return /* @__PURE__ */ jsx(DashboardShell, { title: patient.full_name, children: /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
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
      /* @__PURE__ */ jsx(Button, { asChild: true, children: /* @__PURE__ */ jsxs(Link, { to: "/professional/patients/$id/record", params: {
        id
      }, children: [
        /* @__PURE__ */ jsx(Stethoscope, { className: "mr-2 size-4" }),
        "Abrir prontuário"
      ] }) })
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
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Dados cadastrais" }) }),
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
            /* @__PURE__ */ jsx(TableCell, { children: (/* @__PURE__ */ new Date(a.date + "T12:00:00")).toLocaleDateString("pt-BR") }),
            /* @__PURE__ */ jsx(TableCell, { children: a.start_time?.slice(0, 5) }),
            /* @__PURE__ */ jsx(TableCell, { children: APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—" }),
            /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", children: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—" }) })
          ] }, a.id)) })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "sessoes", children: /* @__PURE__ */ jsx(PatientSessionsContent, { patientId: id, patientName: patient.full_name, active: tab === "sessoes" }) })
    ] })
  ] }) });
}
export {
  ProfessionalPatientPage as component
};
