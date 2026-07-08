import { fmtDateLong, zonedDateFromWallClock } from "@/lib/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CalendarDays, LayoutGrid, List, Lock, MapPin, Plus, Video } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { AgendaRescheduleButton } from "@/components/agenda/agenda-appointment-actions";
import { AgendaContactActions } from "@/components/agenda/agenda-contact-actions";
import { AgendaFiltersPanel } from "@/components/agenda/agenda-filters-panel";
import { AgendaSummaryCards } from "@/components/agenda/agenda-summary-cards";
import { AgendaRescheduleDialog } from "@/components/agenda/agenda-reschedule-dialog";
import { ScheduleBlockDialog } from "@/components/agenda/schedule-block-dialog";
import { AgendaRoomsOverview } from "@/components/agenda/agenda-rooms-overview";
import { AgendaTimelineView, type AgendaRow } from "@/components/agenda/agenda-timeline-view";
import { AgendaWeekView } from "@/components/agenda/agenda-week-view";
import { useAppointmentCancelConfirm } from "@/components/agenda/use-appointment-cancel-confirm";
import { PatientSearchField } from "@/components/patient-search-field";
import {
  AppointmentBillingSection,
  type AppointmentBillingHandle,
} from "@/components/agenda/appointment-billing-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { softDelete } from "@/lib/trash";
import {
  APPOINTMENT_MODALITY_BADGE,
  APPOINTMENT_MODALITY_OPTIONS,
  APPOINTMENT_MODALITY_SHORT,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  APPOINTMENT_TYPE_OPTIONS,
  DEFAULT_APPOINTMENT_MODALITY,
  isBlockAppointment,
  resolveAppointmentTypes,
} from "@/lib/appointment-types";
import {
  addOneHour,
  formatTimeInterval,
  shiftDate,
  startOfWeekMonday,
  timeToMinutes,
  todayISO,
} from "@/lib/agenda-utils";
import { checkAppointmentConflicts } from "@/lib/appointment-conflicts";
import { patchFormForProfessional } from "@/lib/appointment-professional";
import { useAuth } from "@/lib/mock-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { printWithLetterhead } from "@/lib/letterhead-print";
import { runAppointmentFollowUpInBackground } from "@/lib/appointment-follow-up-client";
import { triggerAppointmentFollowUp } from "@/lib/whatsapp-crm.functions";
import { AUTOMATION_QUEUED_MESSAGE } from "@/lib/automation-messages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reception/agenda")({
  component: AgendaPage,
});

type Professional = {
  id: string;
  full_name: string;
  specialty: string | null;
  appointment_types: string[] | null;
  consultation_service_id?: string | null;
  online_consultation_service_id?: string | null;
};
type Room = { id: string; name: string; color: string | null };
type Appointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string | null;
  modality: string | null;
  specialty: string | null;
  notes: string | null;
  patient_id: string | null;
  professional_id: string | null;
  room_id: string | null;
  patients: { full_name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
  rooms: { name: string; color: string | null } | null;
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function AgendaPage() {
  const { profile } = useAuth();
  const followUpFn = useServerFn(triggerAppointmentFollowUp);
  const billingRef = useRef<AppointmentBillingHandle>(null);
  const isMobile = useIsMobile();
  const userPickedView = useRef(false);
  const { requestStatusChange, cancelConfirmDialog } = useAppointmentCancelConfirm();
  const [viewMode, setViewMode] = useState<"week" | "timeline" | "rooms" | "list">("week");

  // No celular a grade (7 colunas / colunas por profissional) fica larga — usa a lista por padrão.
  useEffect(() => {
    if (!userPickedView.current && isMobile) setViewMode("list");
  }, [isMobile]);
  const [date, setDate] = useState(todayISO());
  const [timeFrom, setTimeFrom] = useState("08:00");
  const [timeTo, setTimeTo] = useState("22:00");
  const [filterProfessional, setFilterProfessional] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleRow, setRescheduleRow] = useState<AgendaRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [patientLabel, setPatientLabel] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    professional_id: "",
    room_id: "none",
    date: todayISO(),
    start_time: "09:00",
    end_time: "10:00",
    type: "consultation",
    modality: DEFAULT_APPOINTMENT_MODALITY as string,
    specialty: "",
    notes: "",
  });

  const removeBlock = async (id: string) => {
    try {
      await softDelete({
        entityType: "appointment",
        table: "appointments",
        id,
        label: "Bloqueio de horário",
      });
      toast.success("Bloqueio removido.");
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const weekStart = useMemo(() => startOfWeekMonday(date), [date]);
  const weekEnd = useMemo(() => shiftDate(weekStart, 6), [weekStart]);

  const load = async (opts?: { silent?: boolean }) => {
    if (!profile) return;
    if (!opts?.silent) setLoading(true);
    let q = supabase
      .from("appointments")
      .select("id,date,start_time,end_time,status,type,modality,specialty,notes,patient_id,professional_id,room_id,patients(full_name,phone),profiles!appointments_professional_id_fkey(full_name),rooms(name,color)")
      .eq("tenant_id", profile.tenant_id)
      .order("date")
      .order("start_time");
    if (viewMode === "week") {
      q = q.gte("date", weekStart).lte("date", weekEnd);
    } else {
      q = q.eq("date", date);
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(((data ?? []) as unknown) as Appointment[]);
    if (!opts?.silent) setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [professionalsRes, roomsRes] = await Promise.all([
        supabase.from("profiles").select("id,full_name,specialty,appointment_types,consultation_service_id,online_consultation_service_id").eq("tenant_id", profile.tenant_id).eq("role", "professional").eq("active", true).order("full_name"),
        supabase.from("rooms").select("id,name,color").eq("tenant_id", profile.tenant_id).eq("active", true).order("name"),
      ]);
      setProfessionals((professionalsRes.data ?? []) as Professional[]);
      setRooms((roomsRes.data ?? []) as Room[]);
    })();
  }, [profile]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, date, viewMode, weekStart, weekEnd]);

  const filteredRows = useMemo(() => {
    const fromMin = timeToMinutes(timeFrom);
    const toMin = timeToMinutes(timeTo);
    return rows.filter((row) => {
      if (!showCancelled && row.status === "cancelled") return false;
      if (filterProfessional !== "all" && row.professional_id !== filterProfessional) return false;
      if (filterRoom === "none" && row.room_id) return false;
      if (filterRoom !== "all" && filterRoom !== "none" && row.room_id !== filterRoom) return false;
      const startMin = timeToMinutes(row.start_time.slice(0, 5));
      return startMin >= fromMin && startMin < toMin;
    });
  }, [rows, showCancelled, filterProfessional, filterRoom, timeFrom, timeTo]);

  /** Visão por consultório: todos os salões; ignora filtro de consultório */
  const filteredRowsForRooms = useMemo(() => {
    const fromMin = timeToMinutes(timeFrom);
    const toMin = timeToMinutes(timeTo);
    return rows.filter((row) => {
      if (!showCancelled && row.status === "cancelled") return false;
      if (filterProfessional !== "all" && row.professional_id !== filterProfessional) return false;
      const startMin = timeToMinutes(row.start_time.slice(0, 5));
      return startMin >= fromMin && startMin < toMin;
    });
  }, [rows, showCancelled, filterProfessional, timeFrom, timeTo]);

  const availableAppointmentTypes = useMemo(() => {
    const professional = professionals.find((p) => p.id === form.professional_id);
    const allowed = resolveAppointmentTypes(professional?.appointment_types);
    return APPOINTMENT_TYPE_OPTIONS.filter((t) => allowed.includes(t.value));
  }, [professionals, form.professional_id]);

  const statsRows = viewMode === "rooms" ? filteredRowsForRooms : filteredRows;

  const openNew = () => {
    setPatientLabel("");
    const defaultProfId =
      filterProfessional !== "all"
        ? filterProfessional
        : professionals.length === 1
          ? professionals[0].id
          : form.professional_id;
    const professional = professionals.find((p) => p.id === defaultProfId);
    const patch = patchFormForProfessional(professional, form.type);
    setForm((f) => ({
      ...f,
      patient_id: "",
      date,
      end_time: addOneHour(f.start_time),
      professional_id: defaultProfId ?? "",
      specialty: patch.specialty,
      type: patch.type,
      modality: DEFAULT_APPOINTMENT_MODALITY,
    }));
    setOpen(true);
  };

  /** Clique em um horário vago da grade semanal → abre o novo agendamento já preenchido. */
  const handleSlotClick = (day: string, time: string) => {
    setPatientLabel("");
    const defaultProfId =
      filterProfessional !== "all"
        ? filterProfessional
        : professionals.length === 1
          ? professionals[0].id
          : form.professional_id;
    const professional = professionals.find((p) => p.id === defaultProfId);
    const patch = patchFormForProfessional(professional, form.type);
    setForm((f) => ({
      ...f,
      patient_id: "",
      date: day,
      start_time: time,
      end_time: addOneHour(time),
      professional_id: defaultProfId ?? "",
      specialty: patch.specialty,
      type: patch.type,
      modality: DEFAULT_APPOINTMENT_MODALITY,
    }));
    setOpen(true);
  };

  const openReschedule = (row: AgendaRow) => {
    setRescheduleRow(row);
    setRescheduleOpen(true);
  };

  const handleRescheduled = (newDate: string) => {
    if (newDate !== date) setDate(newDate);
    else load();
  };

  const save = async () => {
    if (!profile || !form.patient_id || !form.professional_id || !form.date || !form.start_time) {
      toast.error("Preencha paciente, profissional, data e horário.");
      return;
    }
    setSaving(true);

    try {
      const conflict = await checkAppointmentConflicts({
        tenantId: profile.tenant_id,
        date: form.date,
        startTime: form.start_time,
        endTime: form.end_time || addOneHour(form.start_time),
        professionalId: form.professional_id,
        roomId: form.room_id,
      });
      if (conflict.hasConflict) {
        setSaving(false);
        toast.error(conflict.message);
        return;
      }
    } catch (e) {
      setSaving(false);
      toast.error(`Não foi possível verificar disponibilidade: ${(e as Error).message}`);
      return;
    }

    const { data: created, error } = await supabase
      .from("appointments")
      .insert({
        tenant_id: profile.tenant_id,
        patient_id: form.patient_id,
        professional_id: form.professional_id,
        room_id: form.room_id === "none" ? null : form.room_id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time || addOneHour(form.start_time),
        type: form.type || "consultation",
        modality: form.modality || DEFAULT_APPOINTMENT_MODALITY,
        specialty: form.specialty || null,
        notes: form.notes || null,
        status: "scheduled",
        created_by: profile.id,
        source: "reception",
      })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    await billingRef.current?.runBilling(created.id);

    const prof = professionals.find((p) => p.id === form.professional_id);
    const room = form.room_id !== "none" ? rooms.find((r) => r.id === form.room_id) : null;
    const optimistic: Appointment = {
      id: created.id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      status: "scheduled",
      type: form.type || "consultation",
      modality: form.modality || DEFAULT_APPOINTMENT_MODALITY,
      specialty: form.specialty || null,
      notes: form.notes || null,
      patient_id: form.patient_id,
      professional_id: form.professional_id,
      room_id: form.room_id === "none" ? null : form.room_id,
      patients: { full_name: patientLabel, phone: null },
      profiles: { full_name: prof?.full_name ?? "—" },
      rooms: room ? { name: room.name, color: room.color } : null,
    };

    setSaving(false);
    toast.success("Consulta agendada");
    setOpen(false);
    if (form.date !== date) {
      setDate(form.date);
    } else {
      setRows((prev) =>
        [...prev, optimistic].sort((a, b) => a.start_time.localeCompare(b.start_time)),
      );
      void load({ silent: true });
    }

    runAppointmentFollowUpInBackground(followUpFn, {
      appointmentId: created.id,
      patientId: form.patient_id,
      professionalId: form.professional_id,
      startsAt: zonedDateFromWallClock(form.date, form.start_time).toISOString(),
    });
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((current) => current.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success("Situação atualizada");
      if (status === "completed" || status === "no_show") {
        toast.info(AUTOMATION_QUEUED_MESSAGE);
      }
    }
  };

  const handleStatusChange = (id: string, status: string, patientName?: string | null) => {
    void requestStatusChange(status, () => updateStatus(id, status), { patientName });
  };

  const handlePrint = () => {
    const profId = filterProfessional !== "all" ? filterProfessional : null;
    void printWithLetterhead(profId);
  };

  const filtersPanel = (
    <AgendaFiltersPanel
      date={date}
      onDateChange={setDate}
      timeFrom={timeFrom}
      timeTo={timeTo}
      onTimeFromChange={setTimeFrom}
      onTimeToChange={setTimeTo}
      filterProfessional={filterProfessional}
      onFilterProfessionalChange={setFilterProfessional}
      filterRoom={filterRoom}
      onFilterRoomChange={setFilterRoom}
      showCancelled={showCancelled}
      onShowCancelledChange={setShowCancelled}
      professionals={professionals}
      rooms={rooms}
      onNewAppointment={openNew}
      onPrint={handlePrint}
    />
  );

  return (
    <DashboardShell title="Agenda">
      <div className="space-y-4 print:space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">Visualize em grade ou lista, com filtros por data, horário, profissional e consultório.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => { userPickedView.current = true; setViewMode(v as "week" | "timeline" | "rooms" | "list"); }}>
              <TabsList>
                <TabsTrigger value="week" className="gap-1.5">
                  <CalendarDays className="size-4" /> Semana
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5">
                  <LayoutGrid className="size-4" /> Dia
                </TabsTrigger>
                <TabsTrigger value="rooms" className="gap-1.5">
                  <Building2 className="size-4" /> Consultórios
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5">
                  <List className="size-4" /> Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => setBlockOpen(true)} className="print:hidden">
              <Lock className="mr-2 size-4" />Bloquear horário
            </Button>
            <Button onClick={openNew} className="print:hidden">
              <Plus className="mr-2 size-4" />Novo agendamento
            </Button>
          </div>
        </div>

        <AgendaSummaryCards rows={statsRows.filter((r) => !isBlockAppointment(r))} />

        <div className="flex flex-col gap-4 lg:flex-row-reverse">
          <div className="print:hidden">{filtersPanel}</div>

          <div className="min-w-0 flex-1">
            {viewMode === "week" ? (
              <AgendaWeekView
                weekStart={weekStart}
                rows={filteredRows}
                loading={loading}
                onSlotClick={handleSlotClick}
                onReschedule={openReschedule}
                onStatusChange={handleStatusChange}
              />
            ) : viewMode === "timeline" ? (
              <AgendaTimelineView
                date={date}
                rows={filteredRows}
                loading={loading}
                activeProfessionalId={filterProfessional}
                onProfessionalChange={setFilterProfessional}
                professionals={professionals}
                headerExtra={<Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground">{filteredRows.length} horários</Badge>}
                onReschedule={openReschedule}
              />
            ) : viewMode === "rooms" ? (
              <AgendaRoomsOverview
                date={date}
                rows={filteredRowsForRooms}
                rooms={rooms}
                loading={loading}
                onReschedule={openReschedule}
              />
            ) : (
              <Card className="w-full">
                <CardHeader className="flex flex-row items-center justify-center gap-3 text-center sm:justify-between sm:text-left">
                  <CardTitle className="flex items-center justify-center gap-2 text-base capitalize sm:justify-start">
                    <CalendarDays className="size-4" />
                    {fmtDateLong(date)}
                  </CardTitle>
                  <Badge variant="outline">{filteredRows.length} horários</Badge>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Horário</TableHead>
                        <TableHead className="text-center">Paciente</TableHead>
                        <TableHead className="text-center">Contato</TableHead>
                        <TableHead className="text-center">Profissional</TableHead>
                        <TableHead className="text-center">Consultório</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Situação</TableHead>
                        <TableHead className="text-center">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Carregando agenda...</TableCell></TableRow>
                      ) : filteredRows.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum agendamento para os filtros selecionados.</TableCell></TableRow>
                      ) : filteredRows.map((row) => isBlockAppointment(row) ? (
                        <TableRow key={row.id} className="bg-muted/40 [&>td]:text-center">
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatTimeInterval(row.start_time, row.end_time)}
                          </TableCell>
                          <TableCell colSpan={5}>
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Lock className="size-3.5" />
                              <span className="font-medium">{row.notes || "Horário bloqueado"}</span>
                              {row.profiles?.full_name && <span className="text-xs">· {row.profiles.full_name}</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-100 text-slate-700">Bloqueado</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => void removeBlock(row.id)}>Remover</Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={row.id} className="[&>td]:text-center">
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatTimeInterval(row.start_time, row.end_time)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center">
                              {row.patient_id ? (
                                <Link to="/reception/pacientes/$id" params={{ id: row.patient_id }} className="font-medium hover:underline">
                                  {row.patients?.full_name ?? "Paciente"}
                                </Link>
                              ) : "—"}
                              {row.patients?.phone && <div className="text-xs text-muted-foreground">{row.patients.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center">
                              <AgendaContactActions phone={row.patients?.phone} patientId={row.patient_id} patientName={row.patients?.full_name} size="icon" />
                            </div>
                          </TableCell>
                          <TableCell>{row.profiles?.full_name ?? "—"}</TableCell>
                          <TableCell>{row.rooms?.name ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <span>{APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? row.specialty ?? "Consulta"}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "flex h-5 w-fit items-center gap-0.5 px-1.5 text-[10px]",
                                  APPOINTMENT_MODALITY_BADGE[row.modality ?? "presential"],
                                )}
                              >
                                {row.modality === "online" ? <Video className="size-2.5" /> : <MapPin className="size-2.5" />}
                                {APPOINTMENT_MODALITY_SHORT[row.modality ?? "presential"]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled}>
                              {APPOINTMENT_STATUS_LABEL[row.status] ?? row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <AgendaRescheduleButton row={row} onReschedule={openReschedule} size="sm" />
                              <Select value={row.status} onValueChange={(value) => handleStatusChange(row.id, value, row.patients?.full_name)}>
                                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setPatientLabel("");
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <PatientSearchField
              className="md:col-span-2"
              value={patientLabel}
              patientId={form.patient_id}
              onChange={(id, name) => {
                setForm((f) => ({ ...f, patient_id: id }));
                setPatientLabel(name);
              }}
              onClear={() => setForm((f) => ({ ...f, patient_id: "" }))}
            />
            <div>
              <Label>Profissional</Label>
              <Select value={form.professional_id} onValueChange={(value) => {
                const professional = professionals.find((p) => p.id === value);
                const patch = patchFormForProfessional(professional, form.type);
                setForm((f) => ({
                  ...f,
                  professional_id: value,
                  specialty: patch.specialty,
                  type: patch.type,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {professionals.map((professional) => <SelectItem key={professional.id} value={professional.id}>{professional.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consultório</Label>
              <Select value={form.room_id} onValueChange={(value) => setForm((f) => ({ ...f, room_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem consultório</SelectItem>
                  {rooms.map((room) => <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value, end_time: addOneHour(e.target.value) }))} /></div>
              <div><Label>Fim</Label><Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}
                disabled={!form.professional_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.professional_id ? "Selecione" : "Escolha o profissional"} />
                </SelectTrigger>
                <SelectContent>
                  {availableAppointmentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select value={form.modality} onValueChange={(value) => setForm((f) => ({ ...f, modality: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_MODALITY_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input
                value={form.specialty}
                readOnly
                placeholder="Preenchida ao selecionar o profissional"
                className="bg-muted"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {(form.type === "consultation" || form.type === "return") && (
              <div className="md:col-span-2">
                <AppointmentBillingSection
                  ref={billingRef}
                  professional={professionals.find((p) => p.id === form.professional_id)}
                  modality={form.modality}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar agendamento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgendaRescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointment={rescheduleRow}
        rooms={rooms}
        onSaved={handleRescheduled}
      />

      <ScheduleBlockDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        defaultDate={date}
        onSaved={() => void load()}
      />

      {cancelConfirmDialog}
    </DashboardShell>
  );
}
