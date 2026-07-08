import { resolveAppointmentTypes } from "@/lib/appointment-types";

export type AppointmentProfessionalOption = {
  id: string;
  full_name: string;
  specialty: string | null;
  appointment_types: string[] | null;
  consultation_service_id?: string | null;
  online_consultation_service_id?: string | null;
};

/** Campos derivados ao escolher o profissional no agendamento. */
export function patchFormForProfessional(
  pro: AppointmentProfessionalOption | undefined,
  currentType: string,
) {
  const allowed = resolveAppointmentTypes(pro?.appointment_types);
  return {
    specialty: pro?.specialty?.trim() ?? "",
    type: allowed.includes(currentType as (typeof allowed)[number])
      ? currentType
      : (allowed[0] ?? "consultation"),
    appointmentTypes: pro?.appointment_types ?? null,
  };
}
