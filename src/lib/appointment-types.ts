export const APPOINTMENT_TYPE_OPTIONS = [
  { value: "consultation", label: "Consulta" },
  { value: "return", label: "Retorno" },
  { value: "medication", label: "Medicação" },
  { value: "procedure", label: "Procedimento" },
  { value: "exam", label: "Exame" },
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPE_OPTIONS)[number]["value"];

export const DEFAULT_APPOINTMENT_TYPES: AppointmentType[] = APPOINTMENT_TYPE_OPTIONS.map((t) => t.value);

export const APPOINTMENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_TYPE_OPTIONS.map((t) => [t.value, t.label]),
);

/** Chave em tenant_settings com a duração padrão (min) de cada tipo de atendimento. */
export const APPOINTMENT_DURATION_SETTING_KEY = "appointment_durations";

/** Duração padrão (em minutos) por tipo, usada para preencher o horário de fim. */
export const DEFAULT_APPOINTMENT_DURATIONS: Record<AppointmentType, number> = {
  consultation: 60,
  return: 30,
  medication: 30,
  procedure: 60,
  exam: 30,
};

export type AppointmentDurations = Record<string, number>;

/** Mescla as durações salvas com os padrões, ignorando valores inválidos. */
export function resolveAppointmentDurations(
  value: Partial<Record<string, number>> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = { ...DEFAULT_APPOINTMENT_DURATIONS };
  if (value) {
    for (const [key, minutes] of Object.entries(value)) {
      if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0 && minutes <= 600) {
        out[key] = Math.round(minutes);
      }
    }
  }
  return out;
}

export const APPOINTMENT_MODALITY_OPTIONS = [
  { value: "presential", label: "Consulta Presencial" },
  { value: "online", label: "Consulta Online" },
] as const;

export type AppointmentModality = (typeof APPOINTMENT_MODALITY_OPTIONS)[number]["value"];

export const DEFAULT_APPOINTMENT_MODALITY: AppointmentModality = "presential";

export const APPOINTMENT_MODALITY_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_MODALITY_OPTIONS.map((m) => [m.value, m.label]),
);

/** Rótulo curto para badges compactas na agenda. */
export const APPOINTMENT_MODALITY_SHORT: Record<string, string> = {
  presential: "Presencial",
  online: "Online",
};

/** Estilo da badge de modalidade na agenda. */
export const APPOINTMENT_MODALITY_BADGE: Record<string, string> = {
  presential: "border-slate-200 bg-slate-100 text-slate-700",
  online: "border-sky-200 bg-sky-50 text-sky-700",
};

export function appointmentModalityLabel(modality: string | null | undefined): string {
  if (!modality) return APPOINTMENT_MODALITY_LABEL[DEFAULT_APPOINTMENT_MODALITY];
  return APPOINTMENT_MODALITY_LABEL[modality] ?? modality;
}

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
  in_progress: "Em atendimento",
  rescheduled: "Remarcado",
  blocked: "Bloqueado",
};

/** Tipo especial de agendamento usado para bloquear horários na agenda. */
export const APPOINTMENT_BLOCK_TYPE = "block";

export function isBlockAppointment(row: { type?: string | null; status?: string | null } | null | undefined): boolean {
  return row?.type === APPOINTMENT_BLOCK_TYPE || row?.status === "blocked";
}

/** Consultas que ainda podem ser editadas (não bloqueio, não concluída/cancelada/falta). */
export function isAppointmentEditable(row: {
  type?: string | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!row || isBlockAppointment(row)) return false;
  return !["completed", "cancelled", "no_show"].includes(row.status ?? "");
}

/** Situações editáveis pelo profissional na Minha Agenda */
export const PROFESSIONAL_AGENDA_STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendando" },
  { value: "confirmed", label: "Confirmado" },
  { value: "rescheduled", label: "Remarcado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

export const PROFESSIONAL_AGENDA_STATUS_VALUES = new Set(
  PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((o) => o.value),
);

/** Cores do select de situação (trigger fechado) */
export const PROFESSIONAL_AGENDA_STATUS_TRIGGER: Record<string, string> = {
  scheduled: "border-slate-200 bg-slate-100 text-slate-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rescheduled: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  in_progress: "border-blue-200 bg-blue-50 text-blue-800",
  completed: "border-emerald-300 bg-emerald-100 text-emerald-900",
  no_show: "border-orange-200 bg-orange-50 text-orange-800",
};

/** Cores de cada opção no dropdown */
export const PROFESSIONAL_AGENDA_STATUS_ITEM: Record<string, string> = {
  scheduled:
    "border-slate-200 bg-slate-50 text-slate-700 data-[highlighted]:bg-slate-200 data-[highlighted]:text-slate-900 focus:bg-slate-200 focus:text-slate-900",
  confirmed:
    "border-emerald-200 bg-emerald-50 text-emerald-800 data-[highlighted]:bg-emerald-100 data-[highlighted]:text-emerald-900 focus:bg-emerald-100 focus:text-emerald-900",
  rescheduled:
    "border-amber-200 bg-amber-50 text-amber-800 data-[highlighted]:bg-amber-100 data-[highlighted]:text-amber-900 focus:bg-amber-100 focus:text-amber-900",
  cancelled:
    "border-red-200 bg-red-50 text-red-800 data-[highlighted]:bg-red-100 data-[highlighted]:text-red-900 focus:bg-red-100 focus:text-red-900",
};

export function appointmentStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return APPOINTMENT_STATUS_LABEL[status] ?? status;
}

export function resolveAppointmentTypes(types: string[] | null | undefined): AppointmentType[] {
  const valid = new Set<string>(DEFAULT_APPOINTMENT_TYPES);
  const filtered = (types ?? DEFAULT_APPOINTMENT_TYPES).filter((t): t is AppointmentType =>
    valid.has(t),
  );
  return filtered.length > 0 ? filtered : [...DEFAULT_APPOINTMENT_TYPES];
}
