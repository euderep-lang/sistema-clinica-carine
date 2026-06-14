import { useNavigate } from "@tanstack/react-router";
import { Eye, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  formatTimeInterval,
  formatWeekRange,
  timeToMinutes,
  todayISO,
  weekDaysFromMonday,
} from "@/lib/agenda-utils";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  PROFESSIONAL_AGENDA_STATUS_ITEM,
  PROFESSIONAL_AGENDA_STATUS_OPTIONS,
  PROFESSIONAL_AGENDA_STATUS_TRIGGER,
  PROFESSIONAL_AGENDA_STATUS_VALUES,
} from "@/lib/appointment-types";
import { cn } from "@/lib/utils";
import type { ProfessionalAgendaAppointment } from "@/components/agenda/professional-agenda-day-view";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const STATUS_CLASS: Record<string, string> = {
  scheduled: "border-l-muted-foreground bg-muted/50",
  confirmed: "border-l-primary bg-primary/10",
  in_progress: "border-l-sky-500 bg-sky-500/15",
  completed: "border-l-emerald-500 bg-emerald-500/15",
  cancelled: "border-l-destructive bg-destructive/10 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/15",
  rescheduled: "border-l-violet-500 bg-violet-500/15",
};

export function ProfessionalAgendaWeekView({
  weekStart,
  rows,
  loading,
  onStatusChange,
  onStart,
  onDayClick,
}: {
  weekStart: string;
  rows: ProfessionalAgendaAppointment[];
  loading: boolean;
  onStatusChange: (id: string, status: string) => Promise<boolean>;
  onStart: (appointment: ProfessionalAgendaAppointment) => void;
  onDayClick?: (date: string) => void;
}) {
  const navigate = useNavigate();
  const days = weekDaysFromMonday(weekStart);
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const today = todayISO();

  const byDay = days.map((day) => rows.filter((r) => r.date === day));

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        Semana · {formatWeekRange(weekStart)}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          Carregando agenda…
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-auto">
          <div className="grid min-w-[760px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/30">
            <div className="border-r" />
            {days.map((day, i) => {
              const d = new Date(`${day}T12:00:00`);
              const isWeekend = i >= 5;
              const isToday = day === today;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onDayClick?.(day)}
                  className={cn(
                    "border-r px-2 py-2 text-center transition last:border-r-0",
                    isWeekend && "bg-muted/50",
                    isToday && "bg-primary/10 ring-1 ring-inset ring-primary/30",
                    onDayClick && "hover:bg-muted/70",
                  )}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {WEEKDAY_LABELS[i]}
                  </div>
                  <div className={cn("text-lg font-semibold leading-tight", isToday && "text-primary")}>
                    {d.getDate()}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="relative flex min-w-[760px] flex-1">
            <div className="w-14 shrink-0 border-r bg-muted/20">
              {slots.map((slot) => (
                <div
                  key={slot}
                  className="flex h-14 items-start justify-end border-b pr-1.5 pt-0.5 text-[10px] text-muted-foreground"
                >
                  {slot.slice(0, 2)}h
                </div>
              ))}
            </div>

            <div className="grid flex-1 grid-cols-7">
              {days.map((day, colIndex) => {
                const isWeekend = colIndex >= 5;
                const dayRows = byDay[colIndex];
                const nowPercent = day === today ? currentTimePercent() : null;

                return (
                  <div
                    key={day}
                    className={cn(
                      "relative border-r last:border-r-0",
                      isWeekend && "bg-muted/30",
                    )}
                  >
                    {slots.map((slot) => (
                      <div key={slot} className="h-14 border-b border-dashed border-border/50" />
                    ))}

                    {nowPercent !== null && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-sky-500"
                        style={{ top: `${nowPercent}%` }}
                      >
                        <span className="absolute -left-0.5 -top-1 size-2 rounded-full bg-sky-500" />
                      </div>
                    )}

                    {dayRows.length === 0 && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-1">
                        <span className="text-[10px] text-muted-foreground/60">—</span>
                      </div>
                    )}

                    {dayRows.map((row) => {
                      const startMin =
                        timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
                      const endMin =
                        timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) -
                        AGENDA_DAY_START * 60;
                      const top = Math.max(0, (startMin / totalMinutes) * 100);
                      const height = Math.max(
                        3,
                        ((Math.max(endMin, startMin + 30) - startMin) / totalMinutes) * 100,
                      );

                      return (
                        <Popover key={row.id}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "absolute left-0.5 right-0.5 z-[1] overflow-hidden rounded border border-l-[3px] p-1 text-left shadow-sm transition hover:ring-2 hover:ring-primary/25",
                                STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled,
                                row.status === "cancelled" && "opacity-50 line-through",
                              )}
                              style={{ top: `${top}%`, height: `${height}%`, minHeight: "2.75rem" }}
                            >
                              <div className="text-[9px] font-semibold leading-tight text-primary">
                                {row.start_time.slice(0, 5)}
                              </div>
                              <div className="truncate text-[10px] font-medium leading-tight">
                                {row.patients?.full_name ?? "—"}
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3" align="start">
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium">{row.patients?.full_name ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTimeInterval(row.start_time, row.end_time)}
                                  {row.rooms?.name ? ` · ${row.rooms.name}` : ""}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-[10px]">
                                  {APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta"}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {APPOINTMENT_STATUS_LABEL[row.status] ?? row.status}
                                </Badge>
                              </div>
                              <Select
                                value={
                                  PROFESSIONAL_AGENDA_STATUS_VALUES.has(row.status)
                                    ? row.status
                                    : undefined
                                }
                                onValueChange={(value) => void onStatusChange(row.id, value)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-8 w-full border text-xs font-medium shadow-none",
                                    PROFESSIONAL_AGENDA_STATUS_TRIGGER[row.status] ??
                                      PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled,
                                  )}
                                >
                                  <SelectValue
                                    placeholder={APPOINTMENT_STATUS_LABEL[row.status] ?? row.status}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className={cn(
                                        "text-xs font-medium",
                                        PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value],
                                      )}
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex flex-wrap gap-1">
                                <AgendaContactActions
                                  phone={row.patients?.phone}
                                  patientName={row.patients?.full_name}
                                  size="icon"
                                />
                                {["scheduled", "confirmed", "rescheduled"].includes(row.status) &&
                                  row.patient_id && (
                                    <Button size="sm" onClick={() => onStart(row)}>
                                      <PlayCircle className="mr-1 size-3.5" />
                                      Iniciar
                                    </Button>
                                  )}
                                {row.patient_id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      navigate({
                                        to: "/professional/patients/$id/record",
                                        params: { id: row.patient_id! },
                                      })
                                    }
                                  >
                                    <Eye className="mr-1 size-3.5" />
                                    Prontuário
                                  </Button>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
