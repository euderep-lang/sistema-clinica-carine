import { useCallback, useEffect, useState } from "react";
import { fmtDateTimeFromDate, fmtDate } from "@/lib/locale";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import { NewAppointmentDialog } from "@/components/agenda/new-appointment-dialog";
import { Button } from "@/components/ui/button";
import { getWaPatientContext } from "@/lib/whatsapp-crm.functions";
import { appointmentStatusLabel } from "@/lib/appointment-types";
import { useAuth } from "@/lib/mock-auth";

interface Props {
  patientId: string;
  patientName: string;
  conversationId?: string;
}

export function CrmPatientPanel({ patientId, patientName, conversationId }: Props) {
  const { profile } = useAuth();
  const contextFn = useServerFn(getWaPatientContext);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<
    { id: string; date: string; start_time: string; status: string; profiles?: { full_name: string } | null }[]
  >([]);
  const [lastCompleted, setLastCompleted] = useState<{
    id: string;
    date: string;
    start_time: string;
  } | null>(null);

  const loadContext = useCallback(() => {
    setLoading(true);
    return contextFn({ data: { patientId } })
      .then((ctx) => {
        setUpcoming(ctx.upcoming as typeof upcoming);
        setLastCompleted(ctx.lastCompleted);
      })
      .finally(() => setLoading(false));
  }, [contextFn, patientId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const recordLink =
    profile?.role === "professional"
      ? { to: "/professional/patients/$id/record" as const, params: { id: patientId } }
      : { to: "/reception/pacientes/$id" as const, params: { id: patientId } };

  return (
    <>
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{patientName}</p>
          <Link to={recordLink.to} params={recordLink.params} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Prontuário
            <ExternalLink className="size-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Calendar className="size-3" />
                  Próximas consultas
                </p>
                <ul className="space-y-1">
                  {upcoming.map((a) => (
                    <li key={a.id} className="text-xs">
                      {fmtDateTimeFromDate(new Date(`${a.date}T${a.start_time}`), {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {a.profiles?.full_name ?? "—"}
                      {" · "}
                      {appointmentStatusLabel(a.status)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem consultas futuras agendadas.</p>
            )}

            {lastCompleted ? (
              <p className="text-xs text-muted-foreground">
                Última consulta:{" "}
                {fmtDate(`${lastCompleted.date}T${lastCompleted.start_time}`)}
              </p>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              className="h-7 w-full text-xs"
              onClick={() => setScheduleOpen(true)}
            >
              Agendar consulta
            </Button>
          </>
        )}
      </div>

      <NewAppointmentDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        defaultPatientId={patientId}
        defaultPatientName={patientName}
        defaultProfessionalId={profile?.role === "professional" ? profile.id : undefined}
        appointmentSource="crm"
        waConversationId={conversationId}
        onSaved={() => void loadContext()}
      />
    </>
  );
}
