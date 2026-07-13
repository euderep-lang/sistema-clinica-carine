import { Link } from "@tanstack/react-router";
import { todayISO } from "@/lib/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AGENDA_DAY_END,
  AGENDA_DAY_START,
  AGENDA_SLOT_MINUTES,
  agendaSlotLabel,
  buildHourSlots,
  currentTimePercent,
  formatAgendaDate,
  formatTimeInterval,
  isHalfHourSlot,
  timeToMinutes,
} from "@/lib/agenda-utils";
import {
  APPOINTMENT_MODALITY_BADGE,
  APPOINTMENT_MODALITY_SHORT,
  APPOINTMENT_TYPE_LABEL,
  isBlockAppointment,
} from "@/lib/appointment-types";
import { Lock, Unlock, Video, MapPin } from "lucide-react";
import { AgendaEditButton, AgendaRescheduleButton } from "@/components/agenda/agenda-appointment-actions";
import { AgendaContactActions } from "@/components/agenda/agenda-contact-actions";
import type { ReactNode } from "react";

export type AgendaRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string | null;
  modality?: string | null;
  notes?: string | null;
  specialty: string | null;
  patient_id: string | null;
  professional_id: string | null;
  room_id: string | null;
  patients: { full_name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
  rooms: { name: string; color: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "border-l-muted-foreground bg-muted/40",
  confirmed: "border-l-primary bg-primary/5",
  completed: "border-l-emerald-500 bg-emerald-500/10",
  cancelled: "border-l-destructive bg-destructive/5 opacity-60",
  no_show: "border-l-amber-500 bg-amber-500/10",
};

export function AgendaTimelineView({
  date,
  rows,
  loading,
  activeProfessionalId,
  onProfessionalChange,
  professionals,
  headerExtra,
  showHeader = false,
  onReschedule,
  onEdit,
  onRemoveBlock,
}: {
  date: string;
  rows: AgendaRow[];
  loading: boolean;
  activeProfessionalId: string;
  onProfessionalChange: (id: string) => void;
  professionals: { id: string; full_name: string }[];
  headerExtra?: ReactNode;
  /** Exibe a faixa verde com profissional · data · nº de horários (padrão oculto). */
  showHeader?: boolean;
  onReschedule?: (row: AgendaRow) => void;
  onEdit?: (row: AgendaRow) => void;
  onRemoveBlock?: (id: string) => void;
}) {
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const nowPercent = date === todayISO() ? currentTimePercent() : null;
  const activePro = professionals.find((p) => p.id === activeProfessionalId);

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card">
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary px-4 py-2.5 text-primary-foreground">
          <div className="font-semibold capitalize">
            {activeProfessionalId === "all" ? "Todos os profissionais" : activePro?.full_name ?? "Profissional"}
            <span className="mx-2 opacity-60">·</span>
            <span className="font-normal">{formatAgendaDate(date)}</span>
          </div>
          {headerExtra}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b bg-muted/30 px-3 py-2">
        <button
          type="button"
          onClick={() => onProfessionalChange("all")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            activeProfessionalId === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          Todos
        </button>
        {professionals.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onProfessionalChange(p.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition",
              activeProfessionalId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {p.full_name.split(" ").slice(0, 2).join(" ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Carregando agenda...</div>
      ) : (
        <div className="relative flex flex-1 overflow-auto">
          <div className="w-16 shrink-0 border-r bg-muted/20">
            {slots.map((slot) => (
              <div
                key={slot}
                className={cn(
                  "flex h-11 items-start justify-end border-b pr-2 pt-0.5 text-[11px] tabular-nums",
                  isHalfHourSlot(slot)
                    ? "border-dashed border-border/40 text-muted-foreground/50"
                    : "text-muted-foreground",
                )}
              >
                {agendaSlotLabel(slot)}
              </div>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {slots.map((slot) => (
              <div
                key={slot}
                className={cn(
                  "h-11 border-b",
                  isHalfHourSlot(slot) ? "border-dashed border-border/40" : "border-border/70",
                )}
              />
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
                Nenhum agendamento neste período
              </div>
            )}

            {rows.map((row) => {
              const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
              const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
              const top = Math.max(0, (startMin / totalMinutes) * 100);
              const height = Math.max(4, ((Math.max(endMin, startMin + 30) - startMin) / totalMinutes) * 100);
              const cancelled = row.status === "cancelled";
              const isOnline = row.modality === "online";

              if (isBlockAppointment(row)) {
                return (
                  <div
                    key={row.id}
                    className="absolute left-2 right-2 overflow-hidden rounded-md border border-l-4 border-l-black bg-black p-2 text-white shadow-sm"
                    style={{ top: `${top}%`, height: `${height}%`, minHeight: "2.5rem" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs font-semibold">
                          <Lock className="size-3" />
                          {formatTimeInterval(row.start_time, row.end_time)}
                          {row.profiles?.full_name ? (
                            <span className="font-normal text-white/70">
                              · {row.profiles.full_name}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-sm font-medium">
                          {row.notes || "Horário bloqueado"}
                        </div>
                      </div>
                      {onRemoveBlock ? (
                        <button
                          type="button"
                          title="Desbloquear horário"
                          onClick={() => onRemoveBlock(row.id)}
                          className="flex shrink-0 items-center gap-1 rounded border border-white/40 bg-white/15 px-1.5 py-0.5 text-[11px] font-medium text-white transition hover:bg-white/25"
                        >
                          <Unlock className="size-3" />
                          Desbloquear
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={row.id}
                  role={onReschedule ? "button" : undefined}
                  tabIndex={onReschedule ? 0 : undefined}
                  onClick={onReschedule ? () => onReschedule(row) : undefined}
                  onKeyDown={
                    onReschedule
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onReschedule(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "absolute left-2 right-2 overflow-hidden rounded-md border border-l-4 p-2 shadow-sm",
                    STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled,
                    isOnline && !cancelled && "ring-1 ring-sky-300 ring-offset-0",
                    cancelled && "line-through opacity-50",
                    onReschedule && "cursor-pointer transition hover:ring-2 hover:ring-primary/30",
                  )}
                  style={{ top: `${top}%`, height: `${height}%`, minHeight: "2.75rem" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-primary">
                        {formatTimeInterval(row.start_time, row.end_time)}
                      </div>
                      {row.patient_id ? (
                        <Link
                          to="/reception/pacientes/$id"
                          params={{ id: row.patient_id }}
                          className="block truncate text-sm font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.patients?.full_name ?? "Paciente"}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">—</span>
                      )}
                      <div className="truncate text-xs text-muted-foreground">
                        {row.profiles?.full_name}
                        {row.rooms?.name ? ` · ${row.rooms.name}` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {onEdit && <AgendaEditButton row={row} onEdit={onEdit} />}
                      {onReschedule && <AgendaRescheduleButton row={row} onReschedule={onReschedule} />}
                      <AgendaContactActions
                        phone={row.patients?.phone}
                        patientId={row.patient_id}
                        patientName={row.patients?.full_name}
                        size="icon"
                      />
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "flex h-5 items-center gap-0.5 px-1.5 text-[10px]",
                        APPOINTMENT_MODALITY_BADGE[row.modality ?? "presential"],
                      )}
                    >
                      {isOnline ? <Video className="size-2.5" /> : <MapPin className="size-2.5" />}
                      {APPOINTMENT_MODALITY_SHORT[row.modality ?? "presential"]}
                    </Badge>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta"}
                    </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
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
