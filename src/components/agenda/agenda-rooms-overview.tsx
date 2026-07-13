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
import { APPOINTMENT_MODALITY_SHORT, APPOINTMENT_TYPE_LABEL } from "@/lib/appointment-types";
import { Video, MapPin } from "lucide-react";
import { AgendaEditButton, AgendaRescheduleButton } from "@/components/agenda/agenda-appointment-actions";
import { AgendaContactActions } from "@/components/agenda/agenda-contact-actions";
import type { AgendaRow } from "@/components/agenda/agenda-timeline-view";

type RoomColumn = { id: string; name: string; color: string | null };

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

function roomMatches(row: AgendaRow, columnId: string) {
  if (columnId === "none") return !row.room_id;
  return row.room_id === columnId;
}

export function AgendaRoomsOverview({
  date,
  rows,
  rooms,
  loading,
  onReschedule,
  onEdit,
}: {
  date: string;
  rows: AgendaRow[];
  rooms: RoomColumn[];
  loading: boolean;
  onReschedule?: (row: AgendaRow) => void;
  onEdit?: (row: AgendaRow) => void;
}) {
  const slots = buildHourSlots(AGENDA_DAY_START, AGENDA_DAY_END, AGENDA_SLOT_MINUTES);
  const totalMinutes = (AGENDA_DAY_END - AGENDA_DAY_START) * 60;
  const nowPercent = date === todayISO() ? currentTimePercent() : null;

  const columns = (() => {
    const cols: RoomColumn[] = rooms.map((r) => ({ id: r.id, name: r.name, color: r.color }));
    if (rows.some((r) => !r.room_id)) {
      cols.push({ id: "none", name: "Sem consultório", color: null });
    }
    return cols;
  })();

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border bg-card text-muted-foreground">
        Carregando agenda...
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="font-medium text-foreground">Nenhum consultório cadastrado</p>
        <p className="text-sm">Cadastre consultórios em Configurações → Consultórios para usar esta visão.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card">
      <div className="border-b bg-primary px-4 py-2.5 text-primary-foreground">
        <div className="font-semibold capitalize">Visão geral · {formatAgendaDate(date)}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-normal opacity-90">
          <span>
            {columns.length} {columns.length === 1 ? "coluna" : "colunas"} · {rows.length} agendamentos
          </span>
          {columns.length > 3 && (
            <span className="rounded bg-primary-foreground/15 px-2 py-0.5 text-xs">
              Arraste horizontalmente para ver todos os consultórios
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="inline-grid w-max min-w-full"
          style={{ gridTemplateColumns: `4rem repeat(${columns.length}, 12rem)` }}
        >
          <div className="sticky left-0 z-20 border-b border-r bg-muted/40 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]" />
          {columns.map((col) => (
            <div
              key={col.id}
              className="min-w-[12rem] border-b px-2 py-2 text-center text-sm font-semibold"
              style={col.color ? { borderTop: `3px solid ${col.color}` } : undefined}
            >
              <span className="line-clamp-2">{col.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {rows.filter((r) => roomMatches(r, col.id)).length} horários
              </span>
            </div>
          ))}

          <div className="sticky left-0 z-10 border-r bg-muted/30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]">
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

          {columns.map((col) => {
            const colRows = rows.filter((r) => roomMatches(r, col.id));
            return (
              <div key={col.id} className="relative min-w-[12rem] border-r last:border-r-0">
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
                  />
                )}

                {colRows.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    Livre
                  </div>
                )}

                {colRows.map((row) => {
                  const startMin = timeToMinutes(row.start_time.slice(0, 5)) - AGENDA_DAY_START * 60;
                  const endMin = timeToMinutes((row.end_time ?? row.start_time).slice(0, 5)) - AGENDA_DAY_START * 60;
                  const top = Math.max(0, (startMin / totalMinutes) * 100);
                  const height = Math.max(5, ((Math.max(endMin, startMin + 30) - startMin) / totalMinutes) * 100);

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
                        "absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 p-1.5 text-left shadow-sm",
                        STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled,
                        row.modality === "online" && row.status !== "cancelled" && "ring-1 ring-sky-300",
                        onReschedule && "cursor-pointer transition hover:ring-2 hover:ring-primary/30",
                      )}
                      style={{ top: `${top}%`, height: `${height}%`, minHeight: "2.75rem" }}
                    >
                      <div className="text-[10px] font-semibold text-primary">
                        {formatTimeInterval(row.start_time, row.end_time)}
                      </div>
                      {row.patient_id ? (
                        <Link
                          to="/reception/pacientes/$id"
                          params={{ id: row.patient_id }}
                          className="block truncate text-xs font-medium hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.patients?.full_name ?? "Paciente"}
                        </Link>
                      ) : (
                        <span className="text-xs font-medium">—</span>
                      )}
                      <div className="truncate text-[10px] text-muted-foreground">
                        {row.profiles?.full_name ?? "—"}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Badge>
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
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
                      <div className="flex items-center gap-1 truncate text-[9px] text-muted-foreground">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded px-1 py-px font-medium",
                            row.modality === "online"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {row.modality === "online" ? <Video className="size-2" /> : <MapPin className="size-2" />}
                          {APPOINTMENT_MODALITY_SHORT[row.modality ?? "presential"]}
                        </span>
                        <span className="truncate">{APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? "Consulta"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
