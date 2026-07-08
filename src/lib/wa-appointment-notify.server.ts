/**
 * Processa fila de notificações de agendamento (trigger no Postgres).
 * Garante confirmação WhatsApp mesmo sem o CRM aberto.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { zonedDateFromWallClock } from "@/lib/locale";
import {
  onAppointmentBooked,
  onAppointmentStatusChange,
  processDueFollowUps,
} from "@/lib/wa-follow-up.server";

type QueueRow = {
  id: string;
  appointment_id: string;
  tenant_id: string;
  kind: "booked" | "status";
  payload: { status?: string } | null;
  attempts: number;
};

type AppointmentRow = {
  id: string;
  tenant_id: string;
  patient_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  status: string;
  created_by: string | null;
};

function appointmentStartsAt(appt: AppointmentRow): Date {
  // date + start_time são horário "de parede" de São Paulo; converte para o
  // instante UTC correto (o runtime da Vercel é UTC).
  return zonedDateFromWallClock(String(appt.date), String(appt.start_time));
}

async function markQueueRow(
  id: string,
  patch: { status: string; last_error?: string | null; processed_at?: string | null; attempts?: number },
) {
  await supabaseAdmin
    .from("wa_appointment_notify_queue" as never)
    .update(patch as never)
    .eq("id", id);
}

export async function processAppointmentNotifyQueue(
  limit = 20,
): Promise<{ queued: number; processed: number; failed: number }> {
  const { data: rows } = await supabaseAdmin
    .from("wa_appointment_notify_queue" as never)
    .select("id, appointment_id, tenant_id, kind, payload, attempts")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);

  const queue = (rows ?? []) as QueueRow[];
  let processed = 0;
  let failed = 0;

  for (const row of queue) {
    const { data: claimed } = await supabaseAdmin
      .from("wa_appointment_notify_queue" as never)
      .update({ status: "processing", attempts: row.attempts + 1 } as never)
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    try {
      const { data: appt } = await supabaseAdmin
        .from("appointments")
        .select("id, tenant_id, patient_id, professional_id, date, start_time, status, created_by")
        .eq("id", row.appointment_id)
        .maybeSingle();

      if (!appt?.patient_id || !appt.professional_id) {
        await markQueueRow(row.id, {
          status: "done",
          processed_at: new Date().toISOString(),
          last_error: "agendamento_sem_paciente_ou_profissional",
        });
        processed++;
        continue;
      }

      const apptRow = appt as AppointmentRow;
      const startsAt = appointmentStartsAt(apptRow);

      if (row.kind === "booked") {
        if (apptRow.status === "cancelled" || apptRow.status === "rescheduled") {
          await markQueueRow(row.id, {
            status: "done",
            processed_at: new Date().toISOString(),
            last_error: "consulta_cancelada_ou_reagendada",
          });
          processed++;
          continue;
        }

        await onAppointmentBooked({
          tenantId: apptRow.tenant_id,
          appointmentId: apptRow.id,
          patientId: apptRow.patient_id,
          professionalId: apptRow.professional_id,
          startsAt,
          createdBy: apptRow.created_by,
        });
      } else {
        const status = row.payload?.status ?? apptRow.status;
        if (status !== "completed" && status !== "no_show") {
          await markQueueRow(row.id, {
            status: "done",
            processed_at: new Date().toISOString(),
            last_error: "status_ignorado",
          });
          processed++;
          continue;
        }

        await onAppointmentStatusChange({
          tenantId: apptRow.tenant_id,
          appointmentId: apptRow.id,
          patientId: apptRow.patient_id,
          professionalId: apptRow.professional_id,
          status,
          startsAt,
        });
      }

      await processDueFollowUps(20);

      await markQueueRow(row.id, {
        status: "done",
        processed_at: new Date().toISOString(),
        last_error: null,
      });
      processed++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "erro_desconhecido";
      const attempts = row.attempts + 1;
      await markQueueRow(row.id, {
        status: attempts >= 5 ? "failed" : "pending",
        last_error: message,
        attempts,
      });
      failed++;
      console.error("[wa-appointment-notify]", row.id, message);
    }
  }

  return { queued: queue.length, processed, failed };
}
