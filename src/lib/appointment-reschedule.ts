import { supabase } from "@/integrations/supabase/client";
import { addOneHour } from "@/lib/agenda-utils";

export type AppointmentSlotFields = {
  date: string;
  start_time: string;
  end_time: string | null;
  professional_id: string | null;
  room_id: string | null;
};

function normTime(t: string | null | undefined): string {
  return (t ?? "").slice(0, 5);
}

/** Horário, data, profissional ou consultório mudaram. */
export function hasAppointmentSlotChanged(
  original: AppointmentSlotFields,
  next: AppointmentSlotFields,
): boolean {
  return (
    original.date !== next.date ||
    normTime(original.start_time) !== normTime(next.start_time) ||
    normTime(original.end_time) !== normTime(next.end_time) ||
    original.professional_id !== next.professional_id ||
    (original.room_id ?? null) !== (next.room_id ?? null)
  );
}

/** Status em que remarcar cria novo registro e libera o horário antigo. */
export function usesRescheduleCopyModel(status: string | null | undefined): boolean {
  return ["scheduled", "confirmed", "rescheduled"].includes(status ?? "");
}

function resolveNewAppointmentStatus(oldStatus: string | null): string {
  if (oldStatus === "confirmed") return "confirmed";
  return "scheduled";
}

export interface MoveAppointmentFields {
  patient_id?: string | null;
  type?: string | null;
  modality?: string | null;
  specialty?: string | null;
  notes?: string | null;
}

/**
 * Marca o agendamento atual como remarcado (some da grade) e cria um novo no horário informado.
 */
export async function moveAppointmentToNewSlot(params: {
  appointmentId: string;
  tenantId: string;
  createdBy: string;
  source?: string | null;
  slot: AppointmentSlotFields;
  fields?: MoveAppointmentFields;
}): Promise<{ id: string; date: string }> {
  const { data: old, error: fetchErr } = await supabase
    .from("appointments")
    .select(
      "id, patient_id, professional_id, room_id, date, start_time, end_time, type, modality, specialty, notes, status, source",
    )
    .eq("id", params.appointmentId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!old) throw new Error("Consulta não encontrada");

  const endTime = params.slot.end_time?.trim()
    ? params.slot.end_time
    : addOneHour(params.slot.start_time);

  const { data: created, error: insertErr } = await supabase
    .from("appointments")
    .insert({
      tenant_id: params.tenantId,
      patient_id: params.fields?.patient_id ?? old.patient_id,
      professional_id: params.slot.professional_id,
      room_id: params.slot.room_id,
      date: params.slot.date,
      start_time: params.slot.start_time,
      end_time: endTime,
      type: params.fields?.type ?? old.type ?? "consultation",
      modality: params.fields?.modality ?? old.modality,
      specialty: params.fields?.specialty ?? old.specialty,
      notes: params.fields?.notes ?? old.notes,
      status: resolveNewAppointmentStatus(old.status),
      created_by: params.createdBy,
      source: params.source ?? old.source ?? "reception",
    })
    .select("id, date")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  const { error: updateErr } = await supabase
    .from("appointments")
    .update({ status: "rescheduled" })
    .eq("id", params.appointmentId);

  if (updateErr) throw new Error(updateErr.message);

  return { id: created.id as string, date: created.date as string };
}
