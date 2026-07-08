import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { addMinutes, addOneHour, todayISO } from "@/lib/agenda-utils";
import { getTenantSetting } from "@/lib/settings-helpers";
import { zonedDateFromWallClock } from "@/lib/locale";
import { checkAppointmentConflicts } from "@/lib/appointment-conflicts";
import type { AppointmentSource } from "@/lib/appointment-source";
import { runAppointmentFollowUpInBackground } from "@/lib/appointment-follow-up-client";
import { triggerAppointmentFollowUp } from "@/lib/whatsapp-crm.functions";
import { useAuth } from "@/lib/mock-auth";
import { normalizeSearch } from "@/lib/search";
import { PatientSearchField } from "@/components/patient-search-field";
import {
  AppointmentBillingSection,
  type AppointmentBillingHandle,
} from "@/components/agenda/appointment-billing-section";

type Room = { id: string; name: string };
type Professional = AppointmentProfessionalOption;

/**
 * Regra de negócio: quando a profissional Carine é selecionada, o consultório 1
 * é preenchido automaticamente. Retorna o id da sala ou null se não houver regra.
 */
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

interface NewAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (
    date: string,
    snapshot?: {
      id: string;
      date: string;
      start_time: string;
      end_time: string;
      type: string;
      modality: string;
      patient_id: string;
      patient_name: string;
    },
  ) => void;
  defaultDate?: string;
  /** Profissional pré-selecionado ao abrir o formulário. */
  defaultProfessionalId?: string;
  /** Paciente pré-selecionado (ex.: vindo do CRM). */
  defaultPatientId?: string;
  defaultPatientName?: string;
  /** Origem do agendamento para métricas CRM. */
  appointmentSource?: AppointmentSource;
  /** Conversa WA vinculada (quando agendado pelo CRM). */
  waConversationId?: string;
}

export function NewAppointmentDialog({
  open,
  onOpenChange,
  onSaved,
  defaultDate,
  defaultProfessionalId,
  defaultPatientId,
  defaultPatientName,
  appointmentSource,
  waConversationId,
}: NewAppointmentDialogProps) {
  const { profile } = useAuth();
  const followUpFn = useServerFn(triggerAppointmentFollowUp);
  const billingRef = useRef<AppointmentBillingHandle>(null);
  const durationsRef = useRef<Record<string, number>>({ ...DEFAULT_APPOINTMENT_DURATIONS });
  const endFor = (start: string, type: string) =>
    addMinutes(start, durationsRef.current[type] ?? durationsRef.current.consultation ?? 60);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [appointmentTypes, setAppointmentTypes] = useState<string[] | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    room_id: "none",
    date: todayISO(),
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
    if (!open || !profile) return;
    setPatientLabel(defaultPatientName ?? "");
    setForm((f) => ({
      ...f,
      patient_id: defaultPatientId ?? "",
      date: defaultDate ?? todayISO(),
      end_time: addOneHour(f.start_time),
      modality: DEFAULT_APPOINTMENT_MODALITY,
    }));

    (async () => {
      const [roomsRes, profsRes, durSetting] = await Promise.all([
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
      ]);
      durationsRef.current = resolveAppointmentDurations(durSetting);
      setRooms((roomsRes.data ?? []) as Room[]);
      const profs = (profsRes.data ?? []) as Professional[];
      setProfessionals(profs);
      setForm((f) => ({ ...f, end_time: endFor(f.start_time, f.type) }));

      const initialId =
        defaultProfessionalId ??
        (profile.role === "professional" ? profile.id : profs[0]?.id ?? "");
      if (initialId) applyProfessional(initialId, profs, (roomsRes.data ?? []) as Room[]);
      else setProfessionalId("");
    })();
  }, [open, profile, defaultDate, defaultProfessionalId, defaultPatientId, defaultPatientName]);

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

    try {
      const conflict = await checkAppointmentConflicts({
        tenantId: profile.tenant_id,
        date: form.date,
        startTime: form.start_time,
        endTime: form.end_time || addOneHour(form.start_time),
        professionalId,
        roomId: form.room_id,
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

    const resolvedSource: AppointmentSource | null =
      appointmentSource ??
      (profile.role === "receptionist"
        ? "reception"
        : profile.role === "professional"
          ? "professional"
          : null);
    const { data: created, error } = await supabase
      .from("appointments")
      .insert({
        tenant_id: profile.tenant_id,
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
        status: "scheduled",
        created_by: profile.id,
        source: resolvedSource,
        wa_conversation_id: waConversationId ?? null,
      })
      .select("id, date, start_time, end_time, type, modality, patient_id")
      .single();
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    await billingRef.current?.runBilling(created.id);

    setSaving(false);
    toast.success("Consulta agendada");
    onOpenChange(false);
    onSaved?.(form.date, {
      id: created.id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      type: form.type || "consultation",
      modality: form.modality || DEFAULT_APPOINTMENT_MODALITY,
      patient_id: form.patient_id,
      patient_name: patientLabel,
    });
    runAppointmentFollowUpInBackground(followUpFn, {
      appointmentId: created.id,
      patientId: form.patient_id,
      professionalId,
      startsAt: zonedDateFromWallClock(form.date, form.start_time).toISOString(),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setPatientLabel("");
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
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
          {(form.type === "consultation" || form.type === "return") && (
            <div className="md:col-span-2">
              <AppointmentBillingSection
                ref={billingRef}
                professional={professionals.find((p) => p.id === professionalId)}
                modality={form.modality}
              />
            </div>
          )}
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
