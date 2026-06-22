export const APPOINTMENT_SOURCES = ["crm", "reception", "professional", "import"] as const;

export type AppointmentSource = (typeof APPOINTMENT_SOURCES)[number];

export function appointmentSourceLabel(source: AppointmentSource | null | undefined): string {
  switch (source) {
    case "crm":
      return "CRM";
    case "reception":
      return "Recepção";
    case "professional":
      return "Profissional";
    case "import":
      return "Importação";
    default:
      return "Agenda";
  }
}

export function isCrmAppointment(row: {
  source?: string | null;
  wa_conversation_id?: string | null;
}): boolean {
  return row.source === "crm" || Boolean(row.wa_conversation_id);
}
