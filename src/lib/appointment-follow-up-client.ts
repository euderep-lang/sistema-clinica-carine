import { toast } from "sonner";

interface AppointmentFollowUpInput {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
}

type FollowUpFn = (opts: {
  data: AppointmentFollowUpInput;
}) => Promise<{ conversationId?: string | null }>;

/** Dispara confirmação WhatsApp sem bloquear o fechamento da agenda. */
export function runAppointmentFollowUpInBackground(
  followUpFn: FollowUpFn,
  data: AppointmentFollowUpInput,
) {
  void (async () => {
    try {
      const notify = await followUpFn({ data });
      if (!notify.conversationId) {
        toast.warning(
          "Consulta salva, mas o paciente não tem telefone válido para WhatsApp. Cadastre o celular no prontuário.",
        );
      }
    } catch (e) {
      toast.warning(
        `Consulta salva. A confirmação por WhatsApp será reenviada automaticamente em instantes.${
          e instanceof Error && e.message ? ` (${e.message})` : ""
        }`,
      );
    }
  })();
}
