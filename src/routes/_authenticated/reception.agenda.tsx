import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CalendarDays, LayoutGrid, List, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { AgendaRescheduleButton } from "@/components/agenda/agenda-appointment-actions";
import { AgendaContactActions } from "@/components/agenda/agenda-contact-actions";
import { AgendaFiltersPanel } from "@/components/agenda/agenda-filters-panel";
import { AgendaRescheduleDialog } from "@/components/agenda/agenda-reschedule-dialog";
import { AgendaRoomsOverview } from "@/components/agenda/agenda-rooms-overview";
import { AgendaTimelineView, type AgendaRow } from "@/components/agenda/agenda-timeline-view";
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
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TYPE_LABEL,
  APPOINTMENT_TYPE_OPTIONS,
  resolveAppointmentTypes,
} from "@/lib/appointment-types";
import {
  addOneHour,
  formatTimeInterval,
  timeToMinutes,
  todayISO,
} from "@/lib/agenda-utils";
import { useAuth } from "@/lib/mock-auth";
import { printWithLetterhead } from "@/lib/letterhead-print";

export const Route = createFileRoute("/_authenticated/reception/agenda")({
  component: AgendaPage,
});

type Patient = { id: string; full_name: string; phone: string | null };
type Professional = { id: string; full_name: string; specialty: string | null; appointment_types: string[] | null };
type Room = { id: string; name: string; color: string | null };
type Appointment = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  type: string | null;
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
  const [viewMode, setViewMode] = useState<"timeline" | "rooms" | "list">("timeline");
  const [date, setDate] = useState(todayISO());
  const [timeFrom, setTimeFrom] = useState("08:00");
  const [timeTo, setTimeTo] = useState("22:00");
  const [filterProfessional, setFilterProfessional] = useState("all");
  const [filterRoom, setFilterRoom] = useState("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleRow, setRescheduleRow] = useState<AgendaRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const patientPickerRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    patient_id: "",
    professional_id: "",
    room_id: "none",
    date: todayISO(),
    start_time: "09:00",
    end_time: "10:00",
    type: "consultation",
    specialty: "",
    notes: "",
  });

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,date,start_time,end_time,status,type,specialty,notes,patient_id,professional_id,room_id,patients(full_name,phone),profiles!appointments_professional_id_fkey(full_name),rooms(name,color)")
      .eq("tenant_id", profile.tenant_id)
      .eq("date", date)
      .order("start_time");
    if (error) toast.error(error.message);
    setRows(((data ?? []) as unknown) as Appointment[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [patientsRes, professionalsRes, roomsRes] = await Promise.all([
        supabase.from("patients").select("id,full_name,phone").eq("tenant_id", profile.tenant_id).eq("active", true).order("full_name"),
        supabase.from("profiles").select("id,full_name,specialty,appointment_types").eq("tenant_id", profile.tenant_id).eq("role", "professional").eq("active", true).order("full_name"),
        supabase.from("rooms").select("id,name,color").eq("tenant_id", profile.tenant_id).eq("active", true).order("name"),
      ]);
      setPatients((patientsRes.data ?? []) as Patient[]);
      setProfessionals((professionalsRes.data ?? []) as Professional[]);
      setRooms((roomsRes.data ?? []) as Room[]);
    })();
  }, [profile]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, date]);

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

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => p.full_name.toLowerCase().includes(q) || (p.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")))
      .slice(0, 25);
  }, [patients, patientSearch]);

  useEffect(() => {
    if (!patientPickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!patientPickerRef.current?.contains(event.target as Node)) {
        setPatientPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [patientPickerOpen]);

  const availableAppointmentTypes = useMemo(() => {
    const professional = professionals.find((p) => p.id === form.professional_id);
    const allowed = resolveAppointmentTypes(professional?.appointment_types);
    return APPOINTMENT_TYPE_OPTIONS.filter((t) => allowed.includes(t.value));
  }, [professionals, form.professional_id]);

  const statsRows = viewMode === "rooms" ? filteredRowsForRooms : filteredRows;
  const totals = useMemo(() => ({
    all: statsRows.length,
    confirmed: statsRows.filter((r) => r.status === "confirmed").length,
    completed: statsRows.filter((r) => r.status === "completed").length,
    pending: statsRows.filter((r) => r.status === "scheduled").length,
  }), [statsRows]);

  const openNew = () => {
    setPatientSearch("");
    setPatientPickerOpen(false);
    setForm((f) => ({ ...f, patient_id: "", date, end_time: addOneHour(f.start_time) }));
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
    const { error } = await supabase.from("appointments").insert({
      tenant_id: profile.tenant_id,
      patient_id: form.patient_id,
      professional_id: form.professional_id,
      room_id: form.room_id === "none" ? null : form.room_id,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || addOneHour(form.start_time),
      type: form.type || "consultation",
      specialty: form.specialty || null,
      notes: form.notes || null,
      status: "scheduled",
      created_by: profile.id,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Consulta agendada");
    setOpen(false);
    setDate(form.date);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
      toast.success("Situação atualizada");
    }
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
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "timeline" | "rooms" | "list")}>
              <TabsList>
                <TabsTrigger value="timeline" className="gap-1.5">
                  <LayoutGrid className="size-4" /> Grade
                </TabsTrigger>
                <TabsTrigger value="rooms" className="gap-1.5">
                  <Building2 className="size-4" /> Consultórios
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5">
                  <List className="size-4" /> Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={openNew} className="print:hidden">
              <Plus className="mr-2 size-4" />Novo agendamento
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 print:hidden">
          <SummaryCard label="Total" value={totals.all} />
          <SummaryCard label="Pendentes" value={totals.pending} />
          <SummaryCard label="Confirmados" value={totals.confirmed} />
          <SummaryCard label="Concluídos" value={totals.completed} />
        </div>

        <div className="flex flex-col gap-4 lg:flex-row-reverse">
          <div className="print:hidden">{filtersPanel}</div>

          <div className="min-w-0 flex-1">
            {viewMode === "timeline" ? (
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base capitalize">
                    <CalendarDays className="size-4" />
                    {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                  </CardTitle>
                  <Badge variant="outline">{filteredRows.length} horários</Badge>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Horário</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Consultório</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Carregando agenda...</TableCell></TableRow>
                      ) : filteredRows.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum agendamento para os filtros selecionados.</TableCell></TableRow>
                      ) : filteredRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatTimeInterval(row.start_time, row.end_time)}
                          </TableCell>
                          <TableCell>
                            {row.patient_id ? (
                              <Link to="/reception/pacientes/$id" params={{ id: row.patient_id }} className="font-medium hover:underline">
                                {row.patients?.full_name ?? "Paciente"}
                              </Link>
                            ) : "—"}
                            {row.patients?.phone && <div className="text-xs text-muted-foreground">{row.patients.phone}</div>}
                          </TableCell>
                          <TableCell>
                            <AgendaContactActions phone={row.patients?.phone} patientName={row.patients?.full_name} size="icon" />
                          </TableCell>
                          <TableCell>{row.profiles?.full_name ?? "—"}</TableCell>
                          <TableCell>{row.rooms?.name ?? "—"}</TableCell>
                          <TableCell>{APPOINTMENT_TYPE_LABEL[row.type ?? ""] ?? row.type ?? row.specialty ?? "Consulta"}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_CLASS[row.status] ?? STATUS_CLASS.scheduled}>
                              {APPOINTMENT_STATUS_LABEL[row.status] ?? row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <AgendaRescheduleButton row={row} onReschedule={openReschedule} size="sm" />
                              <Select value={row.status} onValueChange={(value) => updateStatus(row.id, value)}>
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
          if (!value) {
            setPatientSearch("");
            setPatientPickerOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2" ref={patientPickerRef}>
              <Label>Paciente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setPatientPickerOpen(true);
                    setForm((f) => ({ ...f, patient_id: "" }));
                  }}
                  onFocus={() => setPatientPickerOpen(true)}
                  placeholder="Digite o nome ou telefone do paciente"
                  className="pl-9"
                  autoComplete="off"
                />
                {patientPickerOpen && patientSearch.trim() && (
                  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredPatients.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum paciente encontrado</div>
                    ) : (
                      filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setForm((f) => ({ ...f, patient_id: patient.id }));
                            setPatientSearch(patient.full_name);
                            setPatientPickerOpen(false);
                          }}
                        >
                          <span className="font-medium">{patient.full_name}</span>
                          {patient.phone && <span className="text-xs text-muted-foreground">{patient.phone}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Profissional</Label>
              <Select value={form.professional_id} onValueChange={(value) => {
                const professional = professionals.find((p) => p.id === value);
                const types = resolveAppointmentTypes(professional?.appointment_types);
                setForm((f) => ({
                  ...f,
                  professional_id: value,
                  specialty: professional?.specialty ?? f.specialty,
                  type: types.includes(f.type as (typeof types)[number]) ? f.type : types[0],
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
              <Label>Especialidade</Label>
              <Input value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
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
    </DashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-semibold">{value}</div></CardContent></Card>
  );
}
