import { useEffect, useMemo, useRef, useState } from "react";
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
  APPOINTMENT_DURATION_SETTING_KEY,
  APPOINTMENT_MODALITY_OPTIONS,
  APPOINTMENT_TYPE_OPTIONS,
  DEFAULT_APPOINTMENT_DURATIONS,
  DEFAULT_APPOINTMENT_MODALITY,
  resolveAppointmentDurations,
  resolveAppointmentTypes,
} from "@/lib/appointment-types";
import { patchFormForProfessional, type AppointmentProfessionalOption } from "@/lib/appointment-professional";
import { addMinutes, addOneHour } from "@/lib/agenda-utils";
import { getTenantSetting } from "@/lib/settings-helpers";
import { checkAppointmentConflicts } from "@/lib/appointment-conflicts";
import {
  hasAppointmentSlotChanged,
  moveAppointmentToNewSlot,
  usesRescheduleCopyModel,
  type AppointmentSlotFields,
} from "@/lib/appointment-reschedule";
import { useAuth } from "@/lib/mock-auth";
import { normalizeSearch } from "@/lib/search";
import { PatientSearchField } from "@/components/patient-search-field";
import type { AgendaRow } from "@/components/agenda/agenda-timeline-view";

type EditableAppointmentRef = Pick<AgendaRow, "id"> & {
  patients?: AgendaRow["patients"];
};

type Room = { id: string; name: string };
type Professional = AppointmentProfessionalOption;

function autoRoomIdForProfessional(
  pro: Professional | undefined,
  roomList: Room[],
): string | null {
  if (!pro) return null;
  if (!normalizeSearch(pro.full_name).includes("carine")) return null;
  const target = roomList.find((room) => {
    const n = normalizeSearch(room.name);
    return n === "consultorio 1" || /(^|[^0-9])1([^0-9]|$)/.test(n);
  });
  return target?.id ?? null;
}

export function EditAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSaved,
  lockProfessional = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: EditableAppointmentRef | null;
  onSaved: (newDate: string) => void;
  /** Quando true, o profissional não pode ser alterado (agenda do profissional). */
  lockProfessional?: boolean;
}) {
  const { profile } = useAuth();
  const durationsRef = useRef<Record<string, number>>({ ...DEFAULT_APPOINTMENT_DURATIONS });
  const endFor = (start: string, type: string) =>
    addMinutes(start, durationsRef.current[type] ?? durationsRef.current.consultation ?? 60);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [appointmentTypes, setAppointmentTypes] = useState<string[] | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalSlot, setOriginalSlot] = useState<AppointmentSlotFields | null>(null);
  const [originalStatus, setOriginalStatus] = useState<string>("scheduled");
  const [form, setForm] = useState({
    patient_id: "",
    room_id: "none",
    date: "",
    start_time: "09:00",
    end_time: "10:00",
    type: "consultation",
    modality: DEFAULT_APPOINTMENT_MODALITY as string,
    specialty: "",
    notes: "",
  });

  const applyProfessional = (id: string, list: Professional[], roomList: Room[] = rooms) => {
    const pro = list.find((p) => p.id === id);
    setProfessionalId(id);
    setAppointmentTypes(pro?.appointment_types ?? null);
    const autoRoom = autoRoomIdForProfessional(pro, roomList);
    setForm((f) => {
      const patch = patchFormForProfessional(pro, f.type);
      return {
        ...f,
        specialty: patch.specialty,
        type: patch.type,
        end_time: endFor(f.start_time, patch.type),
        room_id: autoRoom ?? f.room_id,
      };
    });
  };

  useEffect(() => {
    if (!open || !profile || !appointment) return;

    setLoading(true);
    (async () => {
      const [roomsRes, profsRes, durSetting, apptRes] = await Promise.all([
        supabase.from("rooms").select("id, name").order("name"),
        supabase
          .from("profiles")
          .select(
            "id, full_name, specialty, appointment_types, consultation_service_id, online_consultation_service_id",
          )
          .eq("role", "professional")
          .eq("active", true)
          .order("full_name"),
        getTenantSetting<Record<string, number>>(profile.tenant_id, APPOINTMENT_DURATION_SETTING_KEY),
        supabase
          .from("appointments")
          .select(
            "id, patient_id, professional_id, room_id, date, start_time, end_time, type, modality, specialty, notes, status, patients(full_name)",
          )
          .eq("id", appointment.id)
          .maybeSingle(),
      ]);

      durationsRef.current = resolveAppointmentDurations(durSetting);
      const roomList = (roomsRes.data ?? []) as Room[];
      setRooms(roomList);
      const profs = (profsRes.data ?? []) as Professional[];
      setProfessionals(profs);

      const appt = apptRes.data;
      if (!appt) {
        toast.error("Consulta não encontrada");
        setLoading(false);
        onOpenChange(false);
        return;
      }

      const patient = appt.patients as { full_name: string } | null;
      setOriginalStatus(appt.status ?? "scheduled");
      setOriginalSlot({
        date: appt.date,
        start_time: appt.start_time.slice(0, 5),
        end_time: (appt.end_time ?? addOneHour(appt.start_time)).slice(0, 5),
        professional_id: appt.professional_id ?? null,
        room_id: appt.room_id ?? null,
      });
      setPatientLabel(patient?.full_name ?? appointment.patients?.full_name ?? "");
      setForm({
        patient_id: appt.patient_id ?? "",
        room_id: appt.room_id ?? "none",
        date: appt.date,
        start_time: appt.start_time.slice(0, 5),
        end_time: (appt.end_time ?? addOneHour(appt.start_time)).slice(0, 5),
        type: appt.type ?? "consultation",
        modality: appt.modality ?? DEFAULT_APPOINTMENT_MODALITY,
        specialty: appt.specialty ?? "",
        notes: appt.notes ?? "",
      });

      const profId = appt.professional_id ?? "";
      if (profId) {
        setProfessionalId(profId);
        const pro = profs.find((p) => p.id === profId);
        setAppointmentTypes(pro?.appointment_types ?? null);
        if (!appt.specialty && pro) {
          setForm((f) => ({ ...f, specialty: pro.specialty ?? "" }));
        }
      }
      setLoading(false);
    })();
  }, [open, profile, appointment, onOpenChange]);

  const availableAppointmentTypes = useMemo(() => {
    const allowed = resolveAppointmentTypes(appointmentTypes);
    return APPOINTMENT_TYPE_OPTIONS.filter((t) => allowed.includes(t.value));
  }, [appointmentTypes]);

  const save = async () => {
    if (!profile || !appointment) return;
    if (!form.patient_id || !professionalId || !form.date || !form.start_time) {
      toast.error("Preencha paciente, profissional, data e horário.");
      return;
    }
    setSaving(true);

    const nextSlot: AppointmentSlotFields = {
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      professional_id: professionalId,
      room_id: form.room_id === "none" ? null : form.room_id,
    };

    const slotChanged =
      originalSlot !== null && hasAppointmentSlotChanged(originalSlot, nextSlot);
    const useCopyModel = slotChanged && usesRescheduleCopyModel(originalStatus);

    try {
      const conflict = await checkAppointmentConflicts({
        tenantId: profile.tenant_id,
        date: nextSlot.date,
        startTime: nextSlot.start_time,
        endTime: nextSlot.end_time,
        professionalId: nextSlot.professional_id,
        roomId: nextSlot.room_id === null ? "none" : nextSlot.room_id,
        excludeAppointmentId: appointment.id,
      });
      if (conflict.hasConflict) {
        setSaving(false);
        toast.error(conflict.message);
        return;
      }
    } catch (e) {
      setSaving(false);
      toast.error(`Não foi possível verificar disponibilidade: ${(e as Error).message}`);
      return;
    }

    if (useCopyModel) {
      try {
        const moved = await moveAppointmentToNewSlot({
          appointmentId: appointment.id,
          tenantId: profile.tenant_id,
          createdBy: profile.id,
          slot: nextSlot,
          fields: {
            patient_id: form.patient_id,
            type: form.type || "consultation",
            modality: form.modality || DEFAULT_APPOINTMENT_MODALITY,
            specialty: form.specialty || null,
            notes: form.notes || null,
          },
        });
        setSaving(false);
        toast.success("Consulta remarcada");
        onOpenChange(false);
        onSaved(moved.date);
        return;
      } catch (e) {
        setSaving(false);
        toast.error((e as Error).message);
        return;
      }
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        patient_id: form.patient_id,
        professional_id: professionalId,
        room_id: form.room_id === "none" ? null : form.room_id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time || addOneHour(form.start_time),
        type: form.type || "consultation",
        modality: form.modality || DEFAULT_APPOINTMENT_MODALITY,
        specialty: form.specialty || null,
        notes: form.notes || null,
      })
      .eq("id", appointment.id);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Consulta atualizada");
    onOpenChange(false);
    onSaved(form.date);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar agendamento</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <PatientSearchField
              className="md:col-span-2"
              value={patientLabel}
              patientId={form.patient_id}
              onChange={(id, name) => {
                setForm((f) => ({ ...f, patient_id: id }));
                setPatientLabel(name);
              }}
              onClear={() => setForm((f) => ({ ...f, patient_id: "" }))}
            />
            <div>
              <Label>Profissional</Label>
              <Select
                value={professionalId}
                onValueChange={(value) => applyProfessional(value, professionals)}
                disabled={lockProfessional}
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
                      end_time: endFor(e.target.value, f.type),
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
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, type: value, end_time: endFor(f.start_time, value) }))
                }
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
              <Label>Modalidade</Label>
              <Select
                value={form.modality}
                onValueChange={(value) => setForm((f) => ({ ...f, modality: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_MODALITY_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
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
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
