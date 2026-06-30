import { supabase } from "@/integrations/supabase/client";
import { addOneHour, timeToMinutes } from "@/lib/agenda-utils";
import { isBlockAppointment } from "@/lib/appointment-types";

/**
 * Status que NÃO ocupam o horário (não geram conflito): cancelados, faltas e
 * remarcados (o registro remarcado deixa de valer; o novo horário é outro
 * agendamento).
 */
const NON_BLOCKING_STATUS = new Set(["cancelled", "no_show", "rescheduled"]);

export interface ConflictCheckInput {
  tenantId: string;
  date: string;
  /** "HH:MM" (aceita "HH:MM:SS"). */
  startTime: string;
  /** "HH:MM"; quando ausente, assume +1h do início. */
  endTime?: string | null;
  professionalId?: string | null;
  /** id do consultório; "none"/null = sem consultório. */
  roomId?: string | null;
  /** id do agendamento atual, a excluir da checagem (ao reagendar/editar). */
  excludeAppointmentId?: string | null;
}

export interface AppointmentConflict {
  kind: "professional" | "room";
  start_time: string;
  end_time: string | null;
  patientName: string | null;
  isBlock: boolean;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: AppointmentConflict[];
  /** Mensagem pronta para exibir ao usuário (vazia se sem conflito). */
  message: string;
}

type Row = {
  id: string;
  start_time: string;
  end_time: string | null;
  status: string | null;
  type: string | null;
  professional_id: string | null;
  room_id: string | null;
  patient_id: string | null;
  patients?: { full_name: string | null } | null;
};

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  // Fim exclusivo: encostar (10:00–11:00 e 11:00–12:00) não é conflito.
  return aStart < bEnd && aEnd > bStart;
}

function hhmm(t: string) {
  return t.slice(0, 5);
}

/**
 * Verifica conflitos de agenda para um horário/profissional/consultório.
 * Considera tanto consultas quanto bloqueios de horário.
 */
export async function checkAppointmentConflicts(
  input: ConflictCheckInput,
): Promise<ConflictResult> {
  const start = hhmm(input.startTime);
  const end = hhmm(input.endTime && input.endTime.trim() ? input.endTime : addOneHour(start));
  const newStart = timeToMinutes(start);
  const newEnd = timeToMinutes(end);

  const roomId = input.roomId && input.roomId !== "none" ? input.roomId : null;
  const professionalId = input.professionalId || null;

  if (!professionalId && !roomId) {
    return { hasConflict: false, conflicts: [], message: "" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, start_time, end_time, status, type, professional_id, room_id, patient_id, patients(full_name)",
    )
    .eq("tenant_id", input.tenantId)
    .eq("date", input.date);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Row[];
  const conflicts: AppointmentConflict[] = [];

  for (const row of rows) {
    if (input.excludeAppointmentId && row.id === input.excludeAppointmentId) continue;
    if (NON_BLOCKING_STATUS.has(row.status ?? "")) continue;

    const rStart = timeToMinutes(hhmm(row.start_time));
    const rEnd = timeToMinutes(hhmm(row.end_time ?? addOneHour(hhmm(row.start_time))));
    if (!overlaps(newStart, newEnd, rStart, rEnd)) continue;

    const isBlock = isBlockAppointment(row);
    const patientName = row.patients?.full_name ?? null;

    if (professionalId && row.professional_id === professionalId) {
      conflicts.push({
        kind: "professional",
        start_time: hhmm(row.start_time),
        end_time: row.end_time ? hhmm(row.end_time) : null,
        patientName,
        isBlock,
      });
      continue;
    }
    if (roomId && row.room_id === roomId) {
      conflicts.push({
        kind: "room",
        start_time: hhmm(row.start_time),
        end_time: row.end_time ? hhmm(row.end_time) : null,
        patientName,
        isBlock,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    message: formatConflictMessage(conflicts),
  };
}

function formatConflictMessage(conflicts: AppointmentConflict[]): string {
  if (conflicts.length === 0) return "";
  const lines = conflicts.map((c) => {
    const period = c.end_time ? `${c.start_time}–${c.end_time}` : `a partir de ${c.start_time}`;
    if (c.isBlock) {
      return c.kind === "professional"
        ? `Profissional com horário bloqueado (${period}).`
        : `Consultório bloqueado (${period}).`;
    }
    const who = c.patientName ? ` — ${c.patientName}` : "";
    return c.kind === "professional"
      ? `Profissional já tem agendamento ${period}${who}.`
      : `Consultório já ocupado ${period}${who}.`;
  });
  return `Conflito de horário:\n${lines.join("\n")}`;
}
