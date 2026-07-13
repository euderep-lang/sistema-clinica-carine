import { fmtDateFull } from "@/lib/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Eye, LayoutGrid, List, Lock, MapPin, Pencil, PlayCircle, Plus, Video, X } from "lucide-react";
import { toast } from "sonner";
import { EditAppointmentDialog } from "@/components/agenda/edit-appointment-dialog";
import { NewAppointmentDialog } from "@/components/agenda/new-appointment-dialog";
import { ScheduleBlockDialog } from "@/components/agenda/schedule-block-dialog";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { AgendaContactActions } from "@/components/agenda/agenda-contact-actions";
import {
  ProfessionalAgendaDayView,
  type ProfessionalAgendaAppointment,
} from "@/components/agenda/professional-agenda-day-view";
import { ProfessionalAgendaWeekView } from "@/components/agenda/professional-agenda-week-view";
import { useAppointmentCancelConfirm } from "@/components/agenda/use-appointment-cancel-confirm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  formatTimeInterval,
  formatWeekRange,
  shiftDate,
  startOfWeekMonday,
  todayISO,
} from "@/lib/agenda-utils";
import {
  APPOINTMENT_MODALITY_BADGE,
  APPOINTMENT_MODALITY_SHORT,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  isAppointmentEditable,
  canCancelAppointment,
  PROFESSIONAL_AGENDA_STATUS_ITEM,
  PROFESSIONAL_AGENDA_STATUS_OPTIONS,
  PROFESSIONAL_AGENDA_STATUS_TRIGGER,
  PROFESSIONAL_AGENDA_STATUS_VALUES,
  showsOnAgendaGrid,
} from "@/lib/appointment-types";
import { useAuth } from "@/lib/mock-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { AUTOMATION_QUEUED_MESSAGE } from "@/lib/automation-messages";
import { softDelete } from "@/lib/trash";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/professional/agenda")({
  component: ProfessionalAgendaPage,
});

type ViewMode = "weekly" | "daily" | "list";

function ProfessionalAgendaPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const userPickedView = useRef(false);
  const { requestStatusChange, cancelConfirmDialog } = useAppointmentCancelConfirm();
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");

  // No celular a visão semanal (7 colunas) fica espremida — usa a diária por padrão.
  useEffect(() => {
    if (!userPickedView.current && isMobile) setViewMode("daily");
  }, [isMobile]);
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<ProfessionalAgendaAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProfessionalAgendaAppointment | null>(null);

  const weekStart = useMemo(() => startOfWeekMonday(date), [date]);
  const weekEnd = useMemo(() => shiftDate(weekStart, 6), [weekStart]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!profile) return;
    if (!opts?.silent) setLoading(true);
    let q = supabase
      .from("appointments")
      .select("id,date,start_time,end_time,status,type,modality,notes,patient_id,patients(full_name,phone),rooms(name)")
      .eq("professional_id", profile.id)
      .order("date")
      .order("start_time");

    if (viewMode === "weekly") {
      q = q.gte("date", weekStart).lte("date", weekEnd);
    } else {
      q = q.eq("date", date);
    }

    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as ProfessionalAgendaAppointment[]);
    if (!opts?.silent) setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, date, viewMode, weekStart, weekEnd]);

  const gridRows = useMemo(
    () => rows.filter((r) => showsOnAgendaGrid(r)),
    [rows],
  );

  const visibleRows = useMemo(() => {
    if (viewMode === "weekly") return gridRows;
    return gridRows.filter((r) => r.date === date);
  }, [gridRows, viewMode, date]);

  const summary = useMemo(() => {
    const source = viewMode === "weekly" ? gridRows : visibleRows;
    const total = source.filter((r) => r.status !== "cancelled").length;
    const done = source.filter((r) => r.status === "completed").length;
    const pending = source.filter(
      (r) => !["completed", "cancelled", "no_show"].includes(r.status),
    ).length;
    return { total, done, pending };
  }, [rows, visibleRows, viewMode]);

  const updateStatus = async (id: string, status: string, cancelReason?: string) => {
    const payload: { status: string; cancel_reason?: string } = { status };
    if (status === "cancelled" && cancelReason) {
      payload.cancel_reason = cancelReason;
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(payload)
      .eq("id", id)
      .select("id, status, cancel_reason")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!data) {
      toast.error("Não foi possível atualizar a consulta.");
      return false;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: data.status } : r)));
    return true;
  };

  const startAppointment = async (appointment: ProfessionalAgendaAppointment) => {
    if (!appointment.patient_id) return;
    const ok = await updateStatus(appointment.id, "in_progress");
    if (!ok) return;
    navigate({
      to: "/professional/patients/$id/record",
      params: { id: appointment.patient_id },
    });
  };

  const handleStatusChange = async (id: string, status: string) => {
    const row = rows.find((r) => r.id === id);
    const result = await requestStatusChange(
      status,
      async (ctx) => {
        const ok = await updateStatus(id, status, ctx?.cancelReason);
        if (ok) {
          if (status === "cancelled") {
            toast.success("Agendamento cancelado");
          } else {
            toast.success("Situação atualizada");
          }
          if (status === "completed" || status === "no_show") {
            toast.info(AUTOMATION_QUEUED_MESSAGE);
          }
        }
        return ok;
      },
      { patientName: row?.patients?.full_name },
    );
    return result ?? false;
  };

  const removeBlock = async (id: string) => {
    try {
      await softDelete({
        entityType: "appointment",
        table: "appointments",
        id,
        label: "Bloqueio de horário",
      });
      toast.success("Horário desbloqueado.");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const shiftPeriod = (days: number) => setDate((d) => shiftDate(d, days));

  const dateLabel =
    viewMode === "weekly"
      ? formatWeekRange(weekStart)
      : fmtDateFull(date);

  const summaryScope = viewMode === "weekly" ? "na semana" : "no dia";

  return (
    <DashboardShell title="Minha Agenda">
      <div className="space-y-6">
        <PageHeader
          title="Minha Agenda"
          description="Consultas do seu consultório. Atualize a situação e acesse prontuários."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBlockOpen(true)}>
                <Lock className="mr-2 size-4" />
                Bloquear horário
              </Button>
              <Button onClick={() => setNewApptOpen(true)}>
                <Plus className="mr-2 size-4" />
                Novo agendamento
              </Button>
            </div>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftPeriod(viewMode === "weekly" ? -7 : -1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftPeriod(viewMode === "weekly" ? 7 : 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNewApptOpen(true)}>
              <Plus className="mr-2 size-4" />
              Agendar
            </Button>
            <span className="text-sm capitalize text-muted-foreground">{dateLabel}</span>
          </div>

          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              userPickedView.current = true;
              setViewMode(v as ViewMode);
            }}
          >
            <TabsList>
              <TabsTrigger value="weekly" className="gap-1.5">
                <CalendarDays className="size-4" />
                Semanal
              </TabsTrigger>
              <TabsTrigger value="daily" className="gap-1.5">
                <LayoutGrid className="size-4" />
                Diária
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="size-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Consultas {summaryScope}</p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Atendidas</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.done}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
            </CardContent>
          </Card>
        </div>

        {viewMode === "weekly" && (
          <ProfessionalAgendaWeekView
            weekStart={weekStart}
            rows={gridRows}
            loading={loading}
            onStatusChange={handleStatusChange}
            onStart={(a) => void startAppointment(a)}
            onEdit={(a) => {
              setEditRow(a);
              setEditOpen(true);
            }}
            onRemoveBlock={removeBlock}
            onDayClick={(day) => {
              setDate(day);
              setViewMode("daily");
            }}
          />
        )}

        {viewMode === "daily" && (
          <ProfessionalAgendaDayView
            date={date}
            rows={visibleRows}
            loading={loading}
            onStatusChange={handleStatusChange}
            onStart={(a) => void startAppointment(a)}
            onEdit={(a) => {
              setEditRow(a);
              setEditOpen(true);
            }}
            onRemoveBlock={removeBlock}
          />
        )}

        {viewMode === "list" && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Horário</TableHead>
                    <TableHead className="text-center">Paciente</TableHead>
                    <TableHead className="text-center">Consultório</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Situação</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Carregando…
                      </TableCell>
                    </TableRow>
                  ) : visibleRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Nenhuma consulta neste dia.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRows.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-center font-mono text-sm">
                          {formatTimeInterval(a.start_time, a.end_time)}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {a.patients?.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {a.rooms?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="flex flex-col items-center gap-1">
                            <span>{APPOINTMENT_TYPE_LABEL[a.type ?? ""] ?? a.type ?? "—"}</span>
                            <span
                              className={cn(
                                "inline-flex w-fit items-center gap-0.5 rounded border px-1.5 py-px text-[10px] font-medium",
                                APPOINTMENT_MODALITY_BADGE[a.modality ?? "presential"],
                              )}
                            >
                              {a.modality === "online" ? <Video className="size-2.5" /> : <MapPin className="size-2.5" />}
                              {APPOINTMENT_MODALITY_SHORT[a.modality ?? "presential"]}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Select
                              value={
                                PROFESSIONAL_AGENDA_STATUS_VALUES.has(a.status) ? a.status : undefined
                              }
                              onValueChange={async (value) => {
                                await handleStatusChange(a.id, value);
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-36 border font-medium shadow-none",
                                  PROFESSIONAL_AGENDA_STATUS_TRIGGER[a.status] ??
                                    PROFESSIONAL_AGENDA_STATUS_TRIGGER.scheduled,
                                )}
                              >
                                <SelectValue
                                  placeholder={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {PROFESSIONAL_AGENDA_STATUS_OPTIONS.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className={cn(
                                      "my-0.5 border font-medium",
                                      PROFESSIONAL_AGENDA_STATUS_ITEM[opt.value],
                                    )}
                                  >
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {isAppointmentEditable(a) && a.patient_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Editar"
                                onClick={() => {
                                  setEditRow(a);
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="mr-1 size-4" />
                                Editar
                              </Button>
                            )}
                            {canCancelAppointment(a.status) && a.patient_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Cancelar"
                                onClick={() => void handleStatusChange(a.id, "cancelled")}
                              >
                                <X className="mr-1 size-4" />
                                Cancelar
                              </Button>
                            )}
                            <AgendaContactActions
                              phone={a.patients?.phone}
                              patientId={a.patient_id}
                              patientName={a.patients?.full_name}
                              size="icon"
                            />
                            {["scheduled", "confirmed"].includes(a.status) &&
                              a.patient_id && (
                                <Button size="sm" onClick={() => void startAppointment(a)}>
                                  <PlayCircle className="mr-1 size-4" />
                                  Iniciar
                                </Button>
                              )}
                            {a.patient_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  navigate({
                                    to: "/professional/patients/$id/record",
                                    params: { id: a.patient_id! },
                                  })
                                }
                              >
                                <Eye className="mr-1 size-4" />
                                Prontuário
                              </Button>
                            )}
                            {a.status === "in_progress" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void handleStatusChange(a.id, "completed")}
                              >
                                Concluir
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <NewAppointmentDialog
        open={newApptOpen}
        onOpenChange={setNewApptOpen}
        defaultProfessionalId={profile?.role === "professional" ? profile.id : undefined}
        defaultDate={date}
        appointmentSource="professional"
        onSaved={(savedDate, snapshot) => {
          if (snapshot) {
            setRows((prev) => {
              if (prev.some((r) => r.id === snapshot.id)) return prev;
              const row: ProfessionalAgendaAppointment = {
                id: snapshot.id,
                date: snapshot.date,
                start_time: snapshot.start_time,
                end_time: snapshot.end_time,
                status: "scheduled",
                type: snapshot.type,
                modality: snapshot.modality,
                patient_id: snapshot.patient_id,
                patients: { full_name: snapshot.patient_name, phone: null },
                rooms: null,
              };
              return [...prev, row].sort(
                (a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time),
              );
            });
          }
          if (savedDate !== date) setDate(savedDate);
          else void load({ silent: true });
        }}
      />

      <ScheduleBlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        defaultProfessionalId={profile?.role === "professional" ? profile.id : undefined}
        defaultDate={date}
        onSaved={(savedDate) => {
          setDate(savedDate);
          void load();
        }}
      />

      <EditAppointmentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        appointment={editRow}
        lockProfessional
        onSaved={(savedDate) => {
          if (savedDate !== date) setDate(savedDate);
          void load();
        }}
      />

      {cancelConfirmDialog}
    </DashboardShell>
  );
}
