import { r as reactExports, j as jsxRuntimeExports } from "../_libs/react.mjs";
import { u as useServerFn } from "./createSsrRpc-fdWaaOKT.mjs";
import { t as toast } from "../_libs/sonner.mjs";
import { u as useAuth, G as resolveAppointmentTypes, H as APPOINTMENT_TYPE_OPTIONS, s as Dialog, t as DialogContent, w as DialogHeader, x as DialogTitle, L as Label, I as Input, S as Select, l as SelectTrigger, m as SelectValue, n as SelectContent, o as SelectItem, T as Textarea, y as DialogFooter, B as Button } from "./router-DcWaovdP.mjs";
import { t as todayISO, s as supabase } from "./index.mjs";
import { a as addOneHour } from "./agenda-utils-DAU-4XZp.mjs";
import { t as triggerAppointmentFollowUp } from "./whatsapp-crm.functions-Dmtynik5.mjs";
import { S as Search } from "../_libs/lucide-react.mjs";
function NewAppointmentDialog({
  open,
  onOpenChange,
  onSaved,
  defaultDate,
  defaultProfessionalId,
  defaultPatientId,
  defaultPatientName
}) {
  const { profile } = useAuth();
  const followUpFn = useServerFn(triggerAppointmentFollowUp);
  const [patients, setPatients] = reactExports.useState([]);
  const [rooms, setRooms] = reactExports.useState([]);
  const [professionals, setProfessionals] = reactExports.useState([]);
  const [professionalId, setProfessionalId] = reactExports.useState("");
  const [appointmentTypes, setAppointmentTypes] = reactExports.useState(null);
  const [patientSearch, setPatientSearch] = reactExports.useState("");
  const [patientPickerOpen, setPatientPickerOpen] = reactExports.useState(false);
  const [saving, setSaving] = reactExports.useState(false);
  const patientPickerRef = reactExports.useRef(null);
  const [form, setForm] = reactExports.useState({
    patient_id: "",
    room_id: "none",
    date: todayISO(),
    start_time: "09:00",
    end_time: "10:00",
    type: "consultation",
    specialty: "",
    notes: ""
  });
  const applyProfessional = (id, list) => {
    const pro = list.find((p) => p.id === id);
    setProfessionalId(id);
    setAppointmentTypes(pro?.appointment_types ?? null);
    const allowed = resolveAppointmentTypes(pro?.appointment_types);
    setForm((f) => ({
      ...f,
      specialty: pro?.specialty ?? "",
      type: allowed.includes(f.type) ? f.type : allowed[0] ?? "consultation"
    }));
  };
  reactExports.useEffect(() => {
    if (!open || !profile) return;
    setPatientSearch("");
    setPatientPickerOpen(false);
    setForm((f) => ({
      ...f,
      patient_id: "",
      date: defaultDate ?? todayISO(),
      end_time: addOneHour(f.start_time),
      specialty: ""
    }));
    (async () => {
      const [patientsRes, roomsRes, profsRes] = await Promise.all([
        supabase.from("patients").select("id, full_name, phone").eq("active", true).order("full_name"),
        supabase.from("rooms").select("id, name").order("name"),
        supabase.from("profiles").select("id, full_name, specialty, appointment_types").eq("role", "professional").eq("active", true).order("full_name")
      ]);
      const loadedPatients = patientsRes.data ?? [];
      setPatients(loadedPatients);
      setRooms(roomsRes.data ?? []);
      const profs = profsRes.data ?? [];
      setProfessionals(profs);
      const initialId = defaultProfessionalId ?? (profile.role === "professional" ? profile.id : profs[0]?.id ?? "");
      if (initialId) applyProfessional(initialId, profs);
      else setProfessionalId("");
      if (defaultPatientId) {
        const patient = loadedPatients.find((p) => p.id === defaultPatientId);
        setForm((f) => ({ ...f, patient_id: defaultPatientId }));
        setPatientSearch(patient?.full_name ?? defaultPatientName ?? "");
      }
    })();
  }, [open, profile, defaultDate, defaultProfessionalId, defaultPatientId, defaultPatientName]);
  reactExports.useEffect(() => {
    if (!patientPickerOpen) return;
    const onPointerDown = (event) => {
      if (!patientPickerRef.current?.contains(event.target)) {
        setPatientPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [patientPickerOpen]);
  const filteredPatients = reactExports.useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return [];
    return patients.filter(
      (p) => p.full_name.toLowerCase().includes(q) || (p.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    ).slice(0, 25);
  }, [patients, patientSearch]);
  const availableAppointmentTypes = reactExports.useMemo(() => {
    const allowed = resolveAppointmentTypes(appointmentTypes);
    return APPOINTMENT_TYPE_OPTIONS.filter((t) => allowed.includes(t.value));
  }, [appointmentTypes]);
  const save = async () => {
    if (!profile || !form.patient_id || !professionalId || !form.date || !form.start_time) {
      toast.error("Preencha paciente, profissional, data e horário.");
      return;
    }
    setSaving(true);
    const { data: created, error } = await supabase.from("appointments").insert({
      tenant_id: profile.tenant_id,
      patient_id: form.patient_id,
      professional_id: professionalId,
      room_id: form.room_id === "none" ? null : form.room_id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      type: form.type || "consultation",
      specialty: form.specialty || null,
      notes: form.notes || null,
      status: "scheduled",
      created_by: profile.id
    }).select("id").single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const startsAt = /* @__PURE__ */ new Date(`${form.date}T${form.start_time}:00`);
    void followUpFn({
      data: {
        appointmentId: created.id,
        patientId: form.patient_id,
        professionalId,
        startsAt: startsAt.toISOString()
      }
    }).catch(() => {
    });
    toast.success("Consulta agendada");
    onOpenChange(false);
    onSaved?.(form.date);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Dialog,
    {
      open,
      onOpenChange: (value) => {
        onOpenChange(value);
        if (!value) {
          setPatientSearch("");
          setPatientPickerOpen(false);
        }
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogContent, { className: "max-h-[90vh] max-w-2xl overflow-y-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DialogHeader, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogTitle, { children: "Novo agendamento" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2 md:col-span-2", ref: patientPickerRef, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Paciente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  value: patientSearch,
                  onChange: (e) => {
                    setPatientSearch(e.target.value);
                    setPatientPickerOpen(true);
                    setForm((f) => ({ ...f, patient_id: "" }));
                  },
                  onFocus: () => setPatientPickerOpen(true),
                  placeholder: "Digite o nome ou telefone do paciente",
                  className: "pl-9",
                  autoComplete: "off"
                }
              ),
              patientPickerOpen && patientSearch.trim() && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md", children: filteredPatients.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 text-sm text-muted-foreground", children: "Nenhum paciente encontrado" }) : filteredPatients.map((patient) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none",
                  onMouseDown: (e) => e.preventDefault(),
                  onClick: () => {
                    setForm((f) => ({ ...f, patient_id: patient.id }));
                    setPatientSearch(patient.full_name);
                    setPatientPickerOpen(false);
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: patient.full_name }),
                    patient.phone && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: patient.phone })
                  ]
                },
                patient.id
              )) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Profissional" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: professionalId,
                onValueChange: (value) => applyProfessional(value, professionals),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Selecione o profissional" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: professionals.map((pro) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: pro.id, children: pro.full_name }, pro.id)) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Consultório" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: form.room_id,
                onValueChange: (value) => setForm((f) => ({ ...f, room_id: value })),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", children: "Sem consultório" }),
                    rooms.map((room) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: room.id, children: room.name }, room.id))
                  ] })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Data" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                type: "date",
                value: form.date,
                onChange: (e) => setForm((f) => ({ ...f, date: e.target.value }))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Início" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "time",
                  value: form.start_time,
                  onChange: (e) => setForm((f) => ({
                    ...f,
                    start_time: e.target.value,
                    end_time: addOneHour(e.target.value)
                  }))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Fim" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  type: "time",
                  value: form.end_time,
                  onChange: (e) => setForm((f) => ({ ...f, end_time: e.target.value }))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Tipo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              Select,
              {
                value: form.type,
                onValueChange: (value) => setForm((f) => ({ ...f, type: value })),
                disabled: !professionalId,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: professionalId ? "Selecione" : "Escolha o profissional" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(SelectContent, { children: availableAppointmentTypes.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: t.value, children: t.label }, t.value)) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Especialidade" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Input,
              {
                value: form.specialty,
                readOnly: true,
                placeholder: "Preenchida ao selecionar o profissional",
                className: "bg-muted"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { children: "Observações" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Textarea,
              {
                value: form.notes,
                onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value }))
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { onClick: save, disabled: saving, children: saving ? "Salvando…" : "Salvar agendamento" })
        ] })
      ] })
    }
  );
}
export {
  NewAppointmentDialog as N
};
