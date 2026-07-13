import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/locale";

const APPOINTMENT_PRIORITY: Record<string, number> = {
  in_progress: 0,
  scheduled: 1,
  confirmed: 1,
  rescheduled: 2,
  completed: 3,
};

function todayIso() {
  return todayISO();
}

/** Consulta do dia deste paciente com este profissional (exclui cancelada/falta). */
export async function findPatientAppointmentToday(
  patientId: string,
  professionalId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, status, start_time")
    .eq("patient_id", patientId)
    .eq("professional_id", professionalId)
    .eq("date", todayIso())
    .in("status", ["in_progress", "scheduled", "confirmed", "completed"]);

  if (error || !data?.length) return null;

  const sorted = [...data].sort((a, b) => {
    const pa = APPOINTMENT_PRIORITY[a.status ?? ""] ?? 9;
    const pb = APPOINTMENT_PRIORITY[b.status ?? ""] ?? 9;
    if (pa !== pb) return pa - pb;
    return (b.start_time ?? "").localeCompare(a.start_time ?? "");
  });

  return sorted[0]?.id ?? null;
}

async function findLinkedMedicalRecord(appointmentId: string) {
  const { data } = await supabase
    .from("medical_records")
    .select("id")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Garante que a consulta de hoje tenha um prontuário vinculado (inclusive evoluções já salvas). */
export async function ensureTodayConsultationLinked(
  patientId: string,
  professionalId: string,
  tenantId: string,
): Promise<{ appointmentId: string | null; linked: boolean }> {
  const appointmentId = await findPatientAppointmentToday(patientId, professionalId);
  if (!appointmentId) return { appointmentId: null, linked: false };

  const existing = await findLinkedMedicalRecord(appointmentId);
  if (existing) return { appointmentId, linked: true };

  const today = todayIso();

  const { data: orphanRecords } = await supabase
    .from("medical_records")
    .select("id")
    .eq("patient_id", patientId)
    .eq("professional_id", professionalId)
    .eq("date", today)
    .is("appointment_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (orphanRecords?.[0]) {
    const { error } = await supabase
      .from("medical_records")
      .update({ appointment_id: appointmentId })
      .eq("id", orphanRecords[0].id);
    return { appointmentId, linked: !error };
  }

  const { data: orphanEvolutions } = await supabase
    .from("patient_evolutions")
    .select("id, evolution_text")
    .eq("patient_id", patientId)
    .eq("professional_id", professionalId)
    .eq("date", today)
    .is("medical_record_id", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!orphanEvolutions?.[0]) return { appointmentId, linked: false };

  const evolution = orphanEvolutions[0];
  const { data: mr, error: mrErr } = await supabase
    .from("medical_records")
    .insert({
      tenant_id: tenantId,
      patient_id: patientId,
      professional_id: professionalId,
      appointment_id: appointmentId,
      date: today,
      notes: evolution.evolution_text,
    })
    .select("id")
    .single();

  if (mrErr || !mr) return { appointmentId, linked: false };

  await supabase
    .from("patient_evolutions")
    .update({ medical_record_id: mr.id })
    .eq("id", evolution.id);

  return { appointmentId, linked: true };
}
