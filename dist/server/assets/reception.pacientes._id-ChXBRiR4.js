import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { f as fmtDate, s as supabase, L as fmtDateFromDate, d as fmt } from "../server.js";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Pencil, MessageCircle, Eye, Plus, FileDown, Copy, Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { aM as Route, D as DashboardShell, C as Card, f as CardContent, q as Badge, B as Button, b as CardHeader, e as CardTitle, J as Table, M as TableHeader, N as TableRow, O as TableHead, Q as TableBody, U as TableCell, F as APPOINTMENT_TYPE_LABEL, V as APPOINTMENT_STATUS_LABEL, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, I as Input, aN as Sheet, aO as SheetContent, aP as SheetHeader, aQ as SheetTitle, aR as pushRecentPatient } from "./router-DKQJQoSP.js";
import { T as Tabs, a as TabsList, b as TabsTrigger, c as TabsContent } from "./tabs-BKWVL3n-.js";
import { P as PatientFormDialog } from "./patient-form-dialog-CDwCSHp-.js";
import { o as openCrmInbox } from "./crm-navigation-CSMuJWnR.js";
import { d as ageFromBirthDate, i as initials, a as avatarColor, m as maskCPF, b as maskPhone } from "./patient-utils-YNqCHR6o.js";
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
import "@radix-ui/react-tabs";
function Field({
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: label }),
    /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: value || "—" })
  ] });
}
function PatientProfile() {
  const {
    id
  } = Route.useParams();
  const {
    tab
  } = Route.useSearch();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordOpen, setRecordOpen] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [filterProf, setFilterProf] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const load = async () => {
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
    pushRecentPatient({
      id: data.id,
      full_name: data.full_name,
      cpf: data.cpf,
      phone: data.phone
    });
    const {
      data: aps
    } = await supabase.from("appointments").select("id, date, start_time, status, type, professional_id, room_id").eq("patient_id", id).order("date", {
      ascending: false
    });
    setAppts(aps ?? []);
    const {
      data: mrs
    } = await supabase.from("medical_records").select("id, date, professional_id, chief_complaint, history, physical_exam, diagnosis, icd10_code, icd10_description, conduct, notes, profiles:professional_id(full_name, specialty)").eq("patient_id", id).order("date", {
      ascending: false
    });
    setRecords(mrs ?? []);
    const {
      data: rxs
    } = await supabase.from("prescriptions").select("id, date, type, status, pdf_url, professional_id, profiles:professional_id(full_name, specialty), prescription_items(medication, position)").eq("patient_id", id).order("date", {
      ascending: false
    });
    setPrescriptions(rxs ?? []);
    const {
      data: files
    } = await supabase.storage.from("patient-documents").list(id, {
      limit: 100,
      sortBy: {
        column: "created_at",
        order: "desc"
      }
    });
    setDocs((files ?? []).filter((f) => f.name).map((f) => ({
      name: f.name,
      size: f.metadata?.size ?? 0,
      created_at: f.created_at ?? ""
    })));
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [id]);
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${id}/${Date.now()}_${file.name}`;
    const {
      error
    } = await supabase.storage.from("patient-documents").upload(path, file);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Documento enviado");
    e.target.value = "";
    load();
  };
  const onDownload = async (name) => {
    const {
      data,
      error
    } = await supabase.storage.from("patient-documents").createSignedUrl(`${id}/${name}`, 60);
    if (error || !data) {
      toast.error("Erro ao baixar");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };
  const onDelete = async (name) => {
    if (!confirm("Excluir este documento?")) return;
    const {
      error
    } = await supabase.storage.from("patient-documents").remove([`${id}/${name}`]);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Documento excluído");
    load();
  };
  const openWhats = () => {
    if (!patient?.phone) {
      toast.error("Paciente sem telefone");
      return;
    }
    openCrmInbox(navigate, {
      patientId: id,
      phone: patient.phone
    });
  };
  if (loading) return /* @__PURE__ */ jsx(DashboardShell, { title: "Paciente", children: /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: "Carregando..." }) });
  if (!patient) return /* @__PURE__ */ jsx(DashboardShell, { title: "Paciente", children: /* @__PURE__ */ jsx("div", { children: "Paciente não encontrado" }) });
  const age = ageFromBirthDate(patient.birth_date);
  return /* @__PURE__ */ jsxs(DashboardShell, { title: patient.full_name, children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(CardContent, { className: "p-6 flex flex-col md:flex-row gap-6 items-start", children: [
        /* @__PURE__ */ jsx("div", { className: `h-24 w-24 rounded-full grid place-items-center text-white text-2xl font-bold shrink-0 ${avatarColor(patient.full_name)}`, children: initials(patient.full_name) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: patient.full_name }),
            "record_number" in patient && patient.record_number != null && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "font-mono tabular-nums", children: [
              "Prontuário ",
              patient.record_number
            ] }),
            patient.health_insurance ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: patient.health_insurance }) : /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "Particular" }),
            !patient.active && /* @__PURE__ */ jsx(Badge, { variant: "destructive", children: "Inativo" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1", children: [
            age !== null && /* @__PURE__ */ jsxs("span", { children: [
              age,
              " anos"
            ] }),
            patient.cpf && /* @__PURE__ */ jsxs("span", { children: [
              "CPF: ",
              maskCPF(patient.cpf)
            ] }),
            patient.phone && /* @__PURE__ */ jsx("span", { children: maskPhone(patient.phone) }),
            patient.email && /* @__PURE__ */ jsx("span", { children: patient.email })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => navigate({
            to: "/reception/agenda"
          }), children: [
            /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4 mr-2" }),
            " Agendar"
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: () => setEditOpen(true), children: [
            /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4 mr-2" }),
            " Editar"
          ] }),
          /* @__PURE__ */ jsxs(Button, { onClick: openWhats, children: [
            /* @__PURE__ */ jsx(MessageCircle, { className: "h-4 w-4 mr-2" }),
            " CRM WhatsApp"
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Tabs, { value: tab, onValueChange: (value) => navigate({
        to: "/reception/pacientes/$id",
        params: {
          id
        },
        search: {
          tab: value
        },
        replace: true
      }), children: [
        /* @__PURE__ */ jsxs(TabsList, { children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "dados", children: "Dados Pessoais" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "consultas", children: "Consultas" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "prontuarios", children: "Prontuários" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "prescricoes", children: "Prescrições" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "documentos", children: "Documentos" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "financeiro", children: "Financeiro" })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "dados", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Informações" }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => setEditOpen(true), children: [
              /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4 mr-2" }),
              " Editar"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(CardContent, { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsx(Field, { label: "Nome", value: patient.full_name }),
            /* @__PURE__ */ jsx(Field, { label: "CPF", value: patient.cpf ? maskCPF(patient.cpf) : null }),
            /* @__PURE__ */ jsx(Field, { label: "RG", value: patient.rg }),
            /* @__PURE__ */ jsx(Field, { label: "Nascimento", value: patient.birth_date }),
            /* @__PURE__ */ jsx(Field, { label: "Sexo", value: patient.gender }),
            /* @__PURE__ */ jsx(Field, { label: "Como nos conheceu", value: patient.how_did_you_find_us }),
            /* @__PURE__ */ jsx(Field, { label: "Telefone", value: patient.phone ? maskPhone(patient.phone) : null }),
            /* @__PURE__ */ jsx(Field, { label: "E-mail", value: patient.email }),
            /* @__PURE__ */ jsx(Field, { label: "Endereço", value: [patient.address_street, patient.address_number, patient.address_neighborhood, patient.address_city, patient.address_state].filter(Boolean).join(", ") }),
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
        /* @__PURE__ */ jsx(TabsContent, { value: "consultas", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Histórico de consultas" }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => navigate({
              to: "/reception/agenda"
            }), children: [
              /* @__PURE__ */ jsx(Calendar, { className: "h-4 w-4 mr-2" }),
              " Novo Agendamento"
            ] })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Horário" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Tipo" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: appts.length === 0 ? /* @__PURE__ */ jsx(TableRow, { children: /* @__PURE__ */ jsx(TableCell, { colSpan: 4, className: "text-center py-8 text-muted-foreground", children: "Nenhuma consulta" }) }) : appts.map((a) => /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableCell, { children: a.date }),
              /* @__PURE__ */ jsx(TableCell, { children: a.start_time?.slice(0, 5) }),
              /* @__PURE__ */ jsx(TableCell, { children: APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—" }),
              /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { variant: "outline", children: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status ?? "—" }) })
            ] }, a.id)) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "prontuarios", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "space-y-3", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Prontuários" }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col md:flex-row gap-2", children: [
              /* @__PURE__ */ jsxs(Select, { value: filterProf, onValueChange: setFilterProf, children: [
                /* @__PURE__ */ jsx(SelectTrigger, { className: "w-full md:w-60", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Profissional" }) }),
                /* @__PURE__ */ jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todos profissionais" }),
                  Array.from(new Map(records.filter((r) => r.profiles).map((r) => [r.professional_id, r.profiles.full_name])).entries()).map(([id2, name]) => /* @__PURE__ */ jsx(SelectItem, { value: id2, children: name }, id2))
                ] })
              ] }),
              /* @__PURE__ */ jsx(Input, { type: "date", value: filterFrom, onChange: (e) => setFilterFrom(e.target.value), className: "md:w-40" }),
              /* @__PURE__ */ jsx(Input, { type: "date", value: filterTo, onChange: (e) => setFilterTo(e.target.value), className: "md:w-40" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { className: "p-0", children: (() => {
            const filtered = records.filter((r) => {
              if (filterProf !== "all" && r.professional_id !== filterProf) return false;
              if (filterFrom && r.date < filterFrom) return false;
              if (filterTo && r.date > filterTo) return false;
              return true;
            });
            if (records.length === 0) {
              return /* @__PURE__ */ jsx("div", { className: "py-12 text-center text-muted-foreground", children: "Nenhum prontuário registrado para este paciente" });
            }
            return /* @__PURE__ */ jsxs(Table, { children: [
              /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
                /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
                /* @__PURE__ */ jsx(TableHead, { children: "CID" }),
                /* @__PURE__ */ jsx(TableHead, { children: "Diagnóstico" }),
                /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsx(TableBody, { children: filtered.map((r) => /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.date) }),
                /* @__PURE__ */ jsx(TableCell, { children: r.profiles?.full_name ?? "—" }),
                /* @__PURE__ */ jsx(TableCell, { children: r.icd10_code ? /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: r.icd10_code }) : "—" }),
                /* @__PURE__ */ jsx(TableCell, { className: "max-w-xs truncate", children: r.diagnosis ?? r.chief_complaint ?? "—" }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-right", children: /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setRecordOpen(r), children: [
                  /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 mr-1" }),
                  " Ver detalhes"
                ] }) })
              ] }, r.id)) })
            ] });
          })() })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "prescricoes", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Prescrições" }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => navigate({
              to: "/professional/prescriptions/new",
              search: {
                patient_id: id
              }
            }), children: [
              /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-2" }),
              " Nova Receita"
            ] })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { children: prescriptions.length === 0 ? /* @__PURE__ */ jsx("div", { className: "py-12 text-center text-muted-foreground", children: "Nenhuma receita emitida para este paciente" }) : /* @__PURE__ */ jsxs(Table, { children: [
            /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
              /* @__PURE__ */ jsx(TableHead, { children: "Data" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Profissional" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Tipo" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Medicamentos" }),
              /* @__PURE__ */ jsx(TableHead, { children: "Situação" }),
              /* @__PURE__ */ jsx(TableHead, { className: "text-right", children: "Ações" })
            ] }) }),
            /* @__PURE__ */ jsx(TableBody, { children: prescriptions.map((r) => {
              const meds = [...r.prescription_items].sort((a, b) => a.position - b.position);
              const list = meds.slice(0, 2).map((m) => m.medication).join(", ") + (meds.length > 2 ? "..." : "");
              const tColor = r.type === "controlada" ? "bg-red-100 text-red-700" : r.type === "especial_2vias" ? "bg-sky-100 text-sky-800" : r.type === "especial" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
              return /* @__PURE__ */ jsxs(TableRow, { children: [
                /* @__PURE__ */ jsx(TableCell, { children: fmtDate(r.date) }),
                /* @__PURE__ */ jsx(TableCell, { children: r.profiles?.full_name ?? "—" }),
                /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, { className: `${tColor} hover:${tColor}`, children: r.type[0].toUpperCase() + r.type.slice(1) }) }),
                /* @__PURE__ */ jsx(TableCell, { className: "text-sm", children: list || "—" }),
                /* @__PURE__ */ jsx(TableCell, { children: r.status === "finalized" ? /* @__PURE__ */ jsx(Badge, { className: "bg-green-100 text-green-700 hover:bg-green-100", children: "Finalizada" }) : /* @__PURE__ */ jsx(Badge, { variant: "secondary", children: "Rascunho" }) }),
                /* @__PURE__ */ jsxs(TableCell, { className: "text-right", children: [
                  /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", disabled: !r.pdf_url, onClick: async () => {
                    if (!r.pdf_url) return;
                    const {
                      data
                    } = await supabase.storage.from("prescriptions").createSignedUrl(r.pdf_url, 60);
                    if (data) window.open(data.signedUrl, "_blank");
                  }, children: /* @__PURE__ */ jsx(FileDown, { className: "h-4 w-4" }) }),
                  /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => navigate({
                    to: "/professional/prescriptions/new",
                    search: {
                      duplicate: r.id
                    }
                  }), children: /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" }) })
                ] })
              ] }, r.id);
            }) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "documentos", children: /* @__PURE__ */ jsxs(Card, { children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-base", children: "Documentos" }),
            /* @__PURE__ */ jsxs("label", { children: [
              /* @__PURE__ */ jsx("input", { type: "file", accept: ".pdf,.jpg,.jpeg,.png", className: "hidden", onChange: onUpload }),
              /* @__PURE__ */ jsx(Button, { asChild: true, size: "sm", children: /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4 mr-2" }),
                " Enviar arquivo"
              ] }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { children: docs.length === 0 ? /* @__PURE__ */ jsx("div", { className: "py-12 text-center text-muted-foreground", children: "Nenhum documento enviado" }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: docs.map((d) => /* @__PURE__ */ jsxs(Card, { className: "p-3 flex items-start gap-3", children: [
            /* @__PURE__ */ jsx(FileText, { className: "h-8 w-8 text-muted-foreground shrink-0" }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: d.name.replace(/^\d+_/, "") }),
              /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
                (d.size / 1024).toFixed(1),
                " KB",
                d.created_at && ` · ${fmtDateFromDate(new Date(d.created_at))}`
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-1 mt-2", children: [
                /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: () => onDownload(d.name), children: [
                  /* @__PURE__ */ jsx(Download, { className: "h-3 w-3 mr-1" }),
                  " Baixar"
                ] }),
                /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", onClick: () => onDelete(d.name), children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3 text-destructive" }) })
              ] })
            ] })
          ] }, d.name)) }) })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "financeiro", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Total gasto" }) }),
            /* @__PURE__ */ jsx(CardContent, { className: "text-2xl font-bold", children: fmt(0) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Pendente" }) }),
            /* @__PURE__ */ jsx(CardContent, { className: "text-2xl font-bold", children: fmt(0) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { children: [
            /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-medium text-muted-foreground", children: "Última consulta paga" }) }),
            /* @__PURE__ */ jsx(CardContent, { className: "text-2xl font-bold", children: "—" })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(PatientFormDialog, { open: editOpen, onOpenChange: setEditOpen, initial: patient, onSaved: () => load() }),
    /* @__PURE__ */ jsx(Sheet, { open: !!recordOpen, onOpenChange: (v) => !v && setRecordOpen(null), children: /* @__PURE__ */ jsxs(SheetContent, { className: "overflow-y-auto sm:max-w-lg", children: [
      /* @__PURE__ */ jsx(SheetHeader, { children: /* @__PURE__ */ jsxs(SheetTitle, { children: [
        "Prontuário · ",
        recordOpen && fmtDate(recordOpen.date)
      ] }) }),
      recordOpen && /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-3 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Profissional: " }),
          recordOpen.profiles?.full_name ?? "—",
          recordOpen.profiles?.specialty ? ` · ${recordOpen.profiles.specialty}` : ""
        ] }),
        recordOpen.icd10_code && /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(Badge, { variant: "secondary", children: [
          recordOpen.icd10_code,
          " - ",
          recordOpen.icd10_description
        ] }) }),
        /* @__PURE__ */ jsx(Field, { label: "Queixa principal", value: recordOpen.chief_complaint }),
        /* @__PURE__ */ jsx(Field, { label: "História", value: recordOpen.history }),
        /* @__PURE__ */ jsx(Field, { label: "Exame físico", value: recordOpen.physical_exam }),
        /* @__PURE__ */ jsx(Field, { label: "Diagnóstico", value: recordOpen.diagnosis }),
        /* @__PURE__ */ jsx(Field, { label: "Conduta", value: recordOpen.conduct }),
        /* @__PURE__ */ jsx(Field, { label: "Observações", value: recordOpen.notes })
      ] })
    ] }) })
  ] });
}
export {
  PatientProfile as component
};
