import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, y as resolveAppointmentTypes, z as APPOINTMENT_TYPE_OPTIONS, o as Dialog, p as DialogContent, q as DialogHeader, r as DialogTitle, L as Label, I as Input, S as Select, i as SelectTrigger, j as SelectValue, k as SelectContent, l as SelectItem, T as Textarea, s as DialogFooter, B as Button } from "./router-wbAJq94_.js";
import { s as supabase } from "./client-CUE-_UGz.js";
import { h as todayISO, a as addOneHour } from "./agenda-utils-DsE3sZeK.js";
function NewAppointmentDialog({
  open,
  onOpenChange,
  onSaved,
  defaultDate,
  defaultProfessionalId
}) {
  const { profile } = useAuth();
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [professionalId, setProfessionalId] = useState("");
  const [appointmentTypes, setAppointmentTypes] = useState(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const patientPickerRef = useRef(null);
  const [form, setForm] = useState({
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
  useEffect(() => {
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
      setPatients(patientsRes.data ?? []);
      setRooms(roomsRes.data ?? []);
      const profs = profsRes.data ?? [];
      setProfessionals(profs);
      const initialId = defaultProfessionalId ?? (profile.role === "professional" ? profile.id : profs[0]?.id ?? "");
      if (initialId) applyProfessional(initialId, profs);
      else setProfessionalId("");
    })();
  }, [open, profile, defaultDate, defaultProfessionalId]);
  useEffect(() => {
    if (!patientPickerOpen) return;
    const onPointerDown = (event) => {
      if (!patientPickerRef.current?.contains(event.target)) {
        setPatientPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [patientPickerOpen]);
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return [];
    return patients.filter(
      (p) => p.full_name.toLowerCase().includes(q) || (p.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
    ).slice(0, 25);
  }, [patients, patientSearch]);
  const availableAppointmentTypes = useMemo(() => {
    const allowed = resolveAppointmentTypes(appointmentTypes);
    return APPOINTMENT_TYPE_OPTIONS.filter((t) => allowed.includes(t.value));
  }, [appointmentTypes]);
  const save = async () => {
    if (!profile || !form.patient_id || !professionalId || !form.date || !form.start_time) {
      toast.error("Preencha paciente, profissional, data e horário.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
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
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Consulta agendada");
    onOpenChange(false);
    onSaved?.(form.date);
  };
  return /* @__PURE__ */ jsx(
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
      children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[90vh] max-w-2xl overflow-y-auto", children: [
        /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Novo agendamento" }) }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 md:col-span-2", ref: patientPickerRef, children: [
            /* @__PURE__ */ jsx(Label, { children: "Paciente" }),
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" }),
              /* @__PURE__ */ jsx(
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
              patientPickerOpen && patientSearch.trim() && /* @__PURE__ */ jsx("div", { className: "absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md", children: filteredPatients.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-3 py-2 text-sm text-muted-foreground", children: "Nenhum paciente encontrado" }) : filteredPatients.map((patient) => /* @__PURE__ */ jsxs(
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
                    /* @__PURE__ */ jsx("span", { className: "font-medium", children: patient.full_name }),
                    patient.phone && /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: patient.phone })
                  ]
                },
                patient.id
              )) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Profissional" }),
            /* @__PURE__ */ jsxs(
              Select,
              {
                value: professionalId,
                onValueChange: (value) => applyProfessional(value, professionals),
                children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione o profissional" }) }),
                  /* @__PURE__ */ jsx(SelectContent, { children: professionals.map((pro) => /* @__PURE__ */ jsx(SelectItem, { value: pro.id, children: pro.full_name }, pro.id)) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Consultório" }),
            /* @__PURE__ */ jsxs(
              Select,
              {
                value: form.room_id,
                onValueChange: (value) => setForm((f) => ({ ...f, room_id: value })),
                children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                  /* @__PURE__ */ jsxs(SelectContent, { children: [
                    /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "Sem consultório" }),
                    rooms.map((room) => /* @__PURE__ */ jsx(SelectItem, { value: room.id, children: room.name }, room.id))
                  ] })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Data" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                type: "date",
                value: form.date,
                onChange: (e) => setForm((f) => ({ ...f, date: e.target.value }))
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { children: "Início" }),
              /* @__PURE__ */ jsx(
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
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { children: "Fim" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  type: "time",
                  value: form.end_time,
                  onChange: (e) => setForm((f) => ({ ...f, end_time: e.target.value }))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Tipo" }),
            /* @__PURE__ */ jsxs(
              Select,
              {
                value: form.type,
                onValueChange: (value) => setForm((f) => ({ ...f, type: value })),
                disabled: !professionalId,
                children: [
                  /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: professionalId ? "Selecione" : "Escolha o profissional" }) }),
                  /* @__PURE__ */ jsx(SelectContent, { children: availableAppointmentTypes.map((t) => /* @__PURE__ */ jsx(SelectItem, { value: t.value, children: t.label }, t.value)) })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(Label, { children: "Especialidade" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: form.specialty,
                readOnly: true,
                placeholder: "Preenchida ao selecionar o profissional",
                className: "bg-muted"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Observações" }),
            /* @__PURE__ */ jsx(
              Textarea,
              {
                value: form.notes,
                onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value }))
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs(DialogFooter, { children: [
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }),
          /* @__PURE__ */ jsx(Button, { onClick: save, disabled: saving, children: saving ? "Salvando…" : "Salvar agendamento" })
        ] })
      ] })
    }
  );
}
export {
  NewAppointmentDialog as N
};
