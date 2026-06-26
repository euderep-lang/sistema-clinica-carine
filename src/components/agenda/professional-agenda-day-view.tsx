import { useNavigate } from "@tanstack/react-router";
import { todayISO } from "@/lib/locale";
import { Eye, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgendaContactActions } from "@/components/agenda/agenda-contact-actions";
import {
  AGENDA_DAY_END,
  AGENDA_DAY_START,
  AGENDA_SLOT_MINUTES,
  buildHourSlots,
  currentTimePercent,
  formatAgendaDate,
  formatTimeInterval,
  timeToMinutes,
} from "@/lib/agenda-utils";
import {
  APPOINTMENT_MODALITY_BADGE,
  APPOINTMENT_MODALITY_SHORT,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  PROFESSIONAL_AGENDA_STATUS_ITEM,
  PROFESSIONAL_AGENDA_STATUS_OPTIONS,
  PROFESSIONAL_AGENDA_STATUS_TRIGGER,
  PROFESSIONAL_AGENDA_STATUS_VALUES,
} from "@/lib/appointment-types";
import { Video, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfessionalAgendaAppointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string | null;
  modality?: string | null;
  patient_id: string | null;
  patients: { full_name: string; phone: string | null } | null;
  rooms: { name: string } | null;
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "border-l-muted-foreground bg-muted/40",
  confirmed: "border-l-primary bg-primary/5",
  in_progress: "border-l-sky-500 bg-sky-500/10",
  completed: "border-l-emerald-500 bg-emerald-500/10",
  cancelled: "border-l-destructive bg-destructive/5 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/10",
  rescheduled: "border-l-violet-500 bg-violet-500/10",
};

export function ProfessionalAgendaDayView({
  date,
  rows,
  loading,
  onStatusChange,
  onStart,
}: {
  date: string;
  rows: ProfessionalAgendaAppointment[];
  loading: boolean;
  onStatusChange: (id: string, status: string) => Promise<boolean>;
  onStart: (appointment: ProfessionalAgendaAppointment) => void;
}) {
  const navigate = useNavigate();
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const nowPercent = date === todayISO() ? currentTimePercent() : null;

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-primary px-4 py-2.5 font-semibold capitalize text-primary-foreground">
        {formatAgendaDate(date)}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          Carregando agenda…
        </div>
      ) : (
        <div className="relative flex flex-1 overflow-auto">
          <div className="w-16 shrink-0 border-r bg-muted/20">
            {slots.map((slot) => (
              <div
                key={slot}
                className="flex h-16 items-start justify-end border-b pr-2 pt-1 text-xs text-muted-foreground"
              >
                {slot.slice(0, 2)}h
              </div>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {slots.map((slot) => (
              <div key={slot} className="h-16 border-b border-dashed border-border/60" />
            ))}

            {nowPercent !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500"
                style={{ top: `${nowPercent}%` }}
              >
                <span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-sky-500" />
              </div>
            )}

            {rows.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma consulta neste dia
              </div>
            )}

            {rows.map((row) => {
              const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
              const endMin =
                timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
              const top = Math.max(0, (startMin / totalMinutes) * 100);
              const height = Math.max(
                4,
                ((Math.max(endMin, startMin + 30) - startMin) / totalMinutes) * 100,
              );
              const cancelled = row.status === "cancelled";

              return (
                <div
                  key={row.id}
                  className={cn(
                    "absolute left-2 right-2 overflow-hidden rounded-md border border-l-4 p-2 shadow-sm",
                    STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled,
                    row.modality === "online" && !cancelled && "ring-1 ring-sky-300",
                    cancelled && "line-through opacity-50",
                  )}
                  style={{ top: `${top}%`, height: `${height}%`, minHeight: "4.5rem" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-primary">
                        {formatTimeInterval(row.start_time, row.end_time)}
                      </div>
                      <span className="block truncate text-sm font-medium">
                        {row.patients?.full_name ?? "—"}
                      </span>
                      <div className="truncate text-xs text-muted-foreground">
                        {row.rooms?.name ?? "—"}
                      </div>
                    </div>
                    <AgendaContactActions
                      phone={row.patients?.phone}
                      patientId={row.patient_id}
                      patientName={row.patients?.full_name}
                      size="icon"
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "flex h-5 items-center gap-0.5 px-1.5 text-[10px]",
                        APPOINTMENT_MODALITY_BADGE[row.modality ?? "presential"],
                      )}
                    >
                      {row.modality === "online" ? <Video className="size-2.5" /> : <MapPin className="size-2.5" />}
                      {APPOINTMENT_MODALITY_SHORT[row.modality ?? "presential"]}
                    </Badge>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta"}
                    </Badge>
                    <Select
                      value={
                        PROFESSIONAL_AGENDA_STATUS_VALUES.has(row.status) ? row.status : undefined
                      }
                      onValueChange={(value) => void onStatusChange(row.id, value)}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-5 w-auto min-w-0 border px-1.5 text-[10px] font-medium shadow-none",
                          PROFESSIONAL_AGENDA_STATUS_TRIGGER[row.status] ??
                            PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled,
                        )}
                      >
                        <SelectValue placeholder={APPOINTMENT_STATUS_LABEL[row.status] ?? row.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className={cn("my-0.5 border text-xs font-medium", PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value])}
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {["scheduled", "confirmed", "rescheduled"].includes(row.status) && row.patient_id && (
                      <Button size="sm" className="h-6 px-2 text-xs" onClick={() => onStart(row)}>
                        <PlayCircle className="mr-1 size-3" />
                        Iniciar
                      </Button>
                    )}
                    {row.patient_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() =>
                          navigate({
                            to: "/professional/patients/$id/record",
                            params: { id: row.patient_id! },
                          })
                        }
                      >
                        <Eye className="mr-1 size-3" />
                        Prontuário
                      </Button>
                    )}
                    {row.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2 text-xs"
                        onClick={() => void onStatusChange(row.id, "completed")}
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
