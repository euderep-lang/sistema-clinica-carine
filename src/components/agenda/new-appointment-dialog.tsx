import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  APPOINTMENT_TYPE_OPTIONS,
  resolveAppointmentTypes,
} from "@/lib/appointment-types";
import { addOneHour, todayISO } from "@/lib/agenda-utils";
import { useAuth } from "@/lib/mock-auth";

type Patient = { id: string; full_name: string; phone: string | null };
type Room = { id: string; name: string };
type Professional = {
  id: string;
  full_name: string;
  specialty: string | null;
  appointment_types: string[] | null;
};

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (date: string) => void;
  defaultDate?: string;
  /** Profissional pré-selecionado ao abrir o formulário. */
  defaultProfessionalId?: string;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  onSaved,
  defaultDate,
  defaultProfessionalId,
}: NewAppointmentDialogProps) {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [appointmentTypes, setAppointmentTypes] = useState<string[] | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const patientPickerRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    patient_id: "",
    room_id: "none",
    date: todayISO(),
    start_time: "09:00",
    end_time: "10:00",
    type: "consultation",
    specialty: "",
    notes: "",
  });

  const applyProfessional = (id: string, list: Professional[]) => {
    const pro = list.find((p) => p.id === id);
    setProfessionalId(id);
    setAppointmentTypes(pro?.appointment_types ?? null);
    const allowed = resolveAppointmentTypes(pro?.appointment_types);
    setForm((f) => ({
      ...f,
      specialty: pro?.specialty ?? "",
      type: allowed.includes(f.type as (typeof allowed)[number]) ? f.type : allowed[0] ?? "consultation",
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
      specialty: "",
    }));

    (async () => {
      const [patientsRes, roomsRes, profsRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id, full_name, phone")
          .eq("active", true)
          .order("full_name"),
        supabase.from("rooms").select("id, name").order("name"),
        supabase
          .from("profiles")
          .select("id, full_name, specialty, appointment_types")
          .eq("role", "professional")
          .eq("active", true)
          .order("full_name"),
      ]);
      setPatients((patientsRes.data ?? []) as Patient[]);
      setRooms((roomsRes.data ?? []) as Room[]);
      const profs = (profsRes.data ?? []) as Professional[];
      setProfessionals(profs);

      const initialId =
        defaultProfessionalId ??
        (profile.role === "professional" ? profile.id : profs[0]?.id ?? "");
      if (initialId) applyProfessional(initialId, profs);
      else setProfessionalId("");
    })();
  }, [open, profile, defaultDate, defaultProfessionalId]);

  useEffect(() => {
    if (!patientPickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!patientPickerRef.current?.contains(event.target as Node)) {
        setPatientPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [patientPickerOpen]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 25);
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
      created_by: profile.id,
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

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) {
          setPatientSearch("");
          setPatientPickerOpen(false);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2" ref={patientPickerRef}>
            <Label>Paciente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setPatientPickerOpen(true);
                  setForm((f) => ({ ...f, patient_id: "" }));
                }}
                onFocus={() => setPatientPickerOpen(true)}
                placeholder="Digite o nome ou telefone do paciente"
                className="pl-9"
                autoComplete="off"
              />
              {patientPickerOpen && patientSearch.trim() && (
                <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                  {filteredPatients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum paciente encontrado
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setForm((f) => ({ ...f, patient_id: patient.id }));
                          setPatientSearch(patient.full_name);
                          setPatientPickerOpen(false);
                        }}
                      >
                        <span className="font-medium">{patient.full_name}</span>
                        {patient.phone && (
                          <span className="text-xs text-muted-foreground">{patient.phone}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <Label>Profissional</Label>
            <Select
              value={professionalId}
              onValueChange={(value) => applyProfessional(value, professionals)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((pro) => (
                  <SelectItem key={pro.id} value={pro.id}>
                    {pro.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Consultório</Label>
            <Select
              value={form.room_id}
              onValueChange={(value) => setForm((f) => ({ ...f, room_id: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem consultório</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Início</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    start_time: e.target.value,
                    end_time: addOneHour(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
              disabled={!professionalId}
            >
              <SelectTrigger>
                <SelectValue placeholder={professionalId ? "Selecione" : "Escolha o profissional"} />
              </SelectTrigger>
              <SelectContent>
                {availableAppointmentTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Especialidade</Label>
            <Input
              value={form.specialty}
              readOnly
              placeholder="Preenchida ao selecionar o profissional"
              className="bg-muted"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
