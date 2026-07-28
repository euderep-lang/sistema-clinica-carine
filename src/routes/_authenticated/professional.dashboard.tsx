import { useEffect, useMemo, useState } from "react";
import { todayISO, fmtDate } from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Ban,
  Calendar as CalIcon,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  PlayCircle,
  Plus,
  Users as UsersIcon,
} from "lucide-react";
import { NewAppointmentDialog } from "@/components/agenda/new-appointment-dialog";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { APPOINTMENT_STATUS_LABEL, showsOnAgendaGrid } from "@/lib/appointment-types";
import {
  listOpenEvolutionDrafts,
  type OpenEvolutionDraft,
} from "@/lib/evolution-draft";
import { filterAppointmentsMissingClinicalRecord } from "@/lib/patient-appointment";
import { useAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/professional/dashboard")({
  component: ProfessionalDashboard,
});

interface TodayAppt {
  id: string;
  patient_id: string | null;
  start_time: string;
  status: string | null;
  patients: { full_name: string } | null;
  rooms: { name: string } | null;
}

interface ListedAppt {
  id: string;
  date: string;
  start_time: string;
  patient_id: string | null;
  patients: { full_name: string } | null;
}

type SummaryKey = "today" | "next" | "month" | "pending";

const SUMMARY_TITLE: Record<SummaryKey, string> = {
  today: "Consultas de hoje",
  next: "Próximas consultas de hoje",
  month: "Atendidos este mês",
  pending: "Prontuários pendentes",
};

function ProfessionalDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [today, setToday] = useState<TodayAppt[]>([]);
  const [monthRows, setMonthRows] = useState<ListedAppt[]>([]);
  const [pendingRows, setPendingRows] = useState<ListedAppt[]>([]);
  const [nextAppt, setNextAppt] = useState<TodayAppt | null>(null);
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState<SummaryKey | null>(null);
  const [openDrafts, setOpenDrafts] = useState<OpenEvolutionDraft[]>([]);

  useEffect(() => {
    const pid = profile?.id;
    if (!pid) return;
    let cancelled = false;
    const refreshDrafts = () => {
      void listOpenEvolutionDrafts(pid).then((drafts) => {
        if (!cancelled) setOpenDrafts(drafts);
      });
    };
    refreshDrafts();
    window.addEventListener("focus", refreshDrafts);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshDrafts);
    };
  }, [profile?.id]);

  const load = async () => {
    if (!profile) return;
    const todayStr = todayISO();
    const firstOfMonth = todayStr.slice(0, 8) + "01";

    const { data: ap } = await supabase
      .from("appointments")
      .select("id, patient_id, start_time, status, patients(full_name), rooms(name)")
      .eq("professional_id", profile.id)
      .eq("date", todayStr)
      .order("start_time");
    const list = ((ap ?? []) as unknown as TodayAppt[]).filter((a) =>
      showsOnAgendaGrid(a, { showCancelled: true }),
    );
    setToday(list);

    const now = new Date().toTimeString().slice(0, 5);
    const upcoming = list.find(
      (a) =>
        (a.start_time ?? "") >= now &&
        ["scheduled", "confirmed", "in_progress"].includes(a.status ?? ""),
    );
    setNextAppt(upcoming ?? null);

    const { data: monthData } = await supabase
      .from("appointments")
      .select("id, date, start_time, patient_id, patients(full_name)")
      .eq("professional_id", profile.id)
      .eq("status", "completed")
      .gte("date", firstOfMonth)
      .lte("date", todayStr)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });
    setMonthRows((monthData ?? []) as unknown as ListedAppt[]);

    const { data: completed } = await supabase
      .from("appointments")
      .select("id, date, start_time, patient_id, patients(full_name)")
      .eq("professional_id", profile.id)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(200);
    const completedList = (completed ?? []) as unknown as ListedAppt[];
    if (completedList.length === 0) {
      setPendingRows([]);
      return;
    }
    const pending = await filterAppointmentsMissingClinicalRecord(
      completedList.filter((c) => Boolean(c.patient_id)),
      profile.id,
    );
    setPendingRows(pending);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const { upcoming, attended, cancelled } = useMemo(() => {
    return {
      upcoming: today.filter((a) => ["scheduled", "confirmed", "in_progress"].includes(a.status ?? "")),
      attended: today.filter((a) => a.status === "completed"),
      cancelled: today.filter((a) => a.status === "cancelled" || a.status === "no_show"),
    };
  }, [today]);

  const nextList = useMemo(() => {
    const now = new Date().toTimeString().slice(0, 5);
    return today.filter(
      (a) =>
        (a.start_time ?? "") >= now &&
        ["scheduled", "confirmed", "in_progress"].includes(a.status ?? ""),
    );
  }, [today]);

  const activeTodayCount = today.filter((a) => showsOnAgendaGrid(a)).length;

  const todayCountSub = useMemo(() => {
    if (cancelled.length === 0) return undefined;
    if (activeTodayCount === 0) return `${cancelled.length} cancelada(s)`;
    return `${activeTodayCount} ativa(s) · ${cancelled.length} cancelada(s)`;
  }, [activeTodayCount, cancelled.length]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Profissional";

  const openPatientRecord = (patientId: string | null, appointmentId?: string) => {
    if (!patientId) return;
    setSummaryOpen(null);
    navigate({
      to: "/professional/patients/$id/record",
      params: { id: patientId },
      search: { appointment: appointmentId },
    });
  };

  return (
    <DashboardShell title="Painel do Profissional">
      <PageHeader
        title={`Olá, ${firstName}`}
        description={
          [profile?.profession, profile?.crm].filter(Boolean).join(" · ") ||
          "Sua agenda e pendências do dia."
        }
        actions={
          <Button onClick={() => setNewApptOpen(true)}>
            <Plus className="mr-2 size-4" />
            Novo agendamento
          </Button>
        }
      />

      {openDrafts.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <FileText className="size-4 shrink-0" />
            <h2 className="text-sm font-semibold">
              Prontuário em aberto ({openDrafts.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Há evoluções começadas e ainda não salvas. Continue de onde parou — o texto foi
            preservado neste dispositivo.
          </p>
          <ul className="mt-3 space-y-2">
            {openDrafts.map((d) => (
              <li
                key={d.patientId}
                className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {d.patientName}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() =>
                    navigate({
                      to: "/professional/patients/$id/record",
                      params: { id: d.patientId },
                      search: { appointment: undefined },
                    })
                  }
                >
                  Continuar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <PageSection title="Indicadores do dia">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Consultas hoje"
            value={today.length}
            icon={CalIcon}
            sub={todayCountSub}
            onClick={() => setSummaryOpen("today")}
          />
          <StatCard
            label="Próxima consulta"
            value={nextAppt ? nextAppt.start_time.slice(0, 5) : "—"}
            sub={
              nextAppt
                ? `${nextAppt.patients?.full_name ?? "Paciente"} · ${nextAppt.rooms?.name ?? ""}`
                : "Sem agendamentos"
            }
            icon={UsersIcon}
            onClick={() => setSummaryOpen("next")}
          />
          <StatCard
            label="Atendidos este mês"
            value={monthRows.length}
            icon={UsersIcon}
            onClick={() => setSummaryOpen("month")}
          />
          <StatCard
            label="Prontuários pendentes"
            value={pendingRows.length}
            icon={AlertCircle}
            tone={pendingRows.length > 0 ? "danger" : "default"}
            onClick={() => setSummaryOpen("pending")}
          />
        </div>
      </PageSection>

      <PageSection
        title="Agenda de hoje"
        actions={
          <Button variant="outline" size="sm" onClick={() => setNewApptOpen(true)}>
            <Plus className="mr-2 size-4" />
            Adicionar agendamento
          </Button>
        }
      >
        <div
          className={cn(
            "grid gap-4",
            cancelled.length > 0 ? "lg:grid-cols-2 xl:grid-cols-3" : "lg:grid-cols-2",
          )}
        >
          <AgendaGroup
            title="A ser atendidos"
            count={upcoming.length}
            emptyMessage="Nenhum paciente aguardando atendimento hoje"
            appointments={upcoming}
            navigate={navigate}
          />
          <AgendaGroup
            title="Já atendidos"
            count={attended.length}
            emptyMessage="Nenhum paciente atendido ainda hoje"
            appointments={attended}
            navigate={navigate}
            attended
          />
          {cancelled.length > 0 && (
            <AgendaGroup
              title="Canceladas"
              count={cancelled.length}
              emptyMessage="Nenhuma consulta cancelada hoje"
              appointments={cancelled}
              navigate={navigate}
              cancelled
            />
          )}
        </div>
      </PageSection>

      <Dialog open={summaryOpen !== null} onOpenChange={(v) => !v && setSummaryOpen(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{summaryOpen ? SUMMARY_TITLE[summaryOpen] : "Lista"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {summaryOpen === "today" && (
              <IndicatorList
                empty="Nenhuma consulta hoje."
                rows={today.map((a) => ({
                  id: a.id,
                  primary: a.patients?.full_name ?? "Paciente",
                  secondary: `${a.start_time.slice(0, 5)}${a.rooms?.name ? ` · ${a.rooms.name}` : ""}`,
                  badge: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status,
                  badgeDanger: a.status === "cancelled" || a.status === "no_show",
                  patientId: a.patient_id,
                }))}
                onOpen={openPatientRecord}
              />
            )}
            {summaryOpen === "next" && (
              <IndicatorList
                empty="Nenhuma consulta restante hoje."
                rows={nextList.map((a) => ({
                  id: a.id,
                  primary: a.patients?.full_name ?? "Paciente",
                  secondary: `${a.start_time.slice(0, 5)}${a.rooms?.name ? ` · ${a.rooms.name}` : ""}`,
                  badge: APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status,
                  patientId: a.patient_id,
                }))}
                onOpen={openPatientRecord}
              />
            )}
            {summaryOpen === "month" && (
              <IndicatorList
                empty="Nenhum atendimento concluído neste mês."
                rows={monthRows.map((a) => ({
                  id: a.id,
                  primary: a.patients?.full_name ?? "Paciente",
                  secondary: `${fmtDate(a.date)} · ${a.start_time.slice(0, 5)}`,
                  patientId: a.patient_id,
                }))}
                onOpen={openPatientRecord}
              />
            )}
            {summaryOpen === "pending" && (
              <IndicatorList
                empty="Nenhum prontuário pendente."
                actionLabel="Abrir prontuário"
                rows={pendingRows.map((a) => ({
                  id: a.id,
                  primary: a.patients?.full_name ?? "Paciente",
                  secondary: `${fmtDate(a.date)} · ${a.start_time.slice(0, 5)}`,
                  patientId: a.patient_id,
                  appointmentId: a.id,
                }))}
                onOpen={openPatientRecord}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NewAppointmentDialog
        open={newApptOpen}
        onOpenChange={setNewApptOpen}
        defaultProfessionalId={profile?.role === "professional" ? profile.id : undefined}
        appointmentSource="professional"
        onSaved={() => void load()}
      />
    </DashboardShell>
  );
}

function IndicatorList({
  rows,
  empty,
  actionLabel = "Prontuário",
  onOpen,
}: {
  rows: Array<{
    id: string;
    primary: string;
    secondary: string;
    badge?: string | null;
    badgeDanger?: boolean;
    patientId: string | null;
    appointmentId?: string;
  }>;
  empty: string;
  actionLabel?: string;
  onOpen: (patientId: string | null, appointmentId?: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{row.primary}</p>
            <p className="text-xs text-muted-foreground">{row.secondary}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {row.badge ? (
              <Badge
                variant="outline"
                className={row.badgeDanger ? "border-destructive/40 text-destructive" : undefined}
              >
                {row.badge}
              </Badge>
            ) : null}
            {row.patientId ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => onOpen(row.patientId, row.appointmentId)}
              >
                <Eye className="mr-1 size-3.5" />
                {actionLabel}
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AgendaGroup({
  title,
  count,
  emptyMessage,
  appointments,
  navigate,
  attended = false,
  cancelled = false,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  appointments: TodayAppt[];
  navigate: ReturnType<typeof useNavigate>;
  attended?: boolean;
  cancelled?: boolean;
}) {
  const Icon = cancelled ? Ban : attended ? CheckCircle2 : Clock;

  return (
    <Card
      className={cn(
        "overflow-hidden ring-1 ring-inset",
        cancelled
          ? "border-destructive/30 bg-destructive/5 ring-destructive/20"
          : attended
            ? "border-emerald-200/70 bg-emerald-50/30 ring-emerald-100"
            : "border-sky-200/70 bg-sky-50/40 ring-sky-100",
      )}
    >
      <CardHeader
        className={cn(
          "border-b pb-4",
          cancelled
            ? "border-destructive/20 bg-destructive/5"
            : attended
              ? "border-emerald-200/60 bg-emerald-50/80"
              : "border-sky-200/60 bg-sky-50/80",
        )}
      >
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full",
                cancelled
                  ? "bg-destructive/10 text-destructive"
                  : attended
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span
              className={
                cancelled ? "text-destructive" : attended ? "text-emerald-900" : "text-sky-900"
              }
            >
              {title}
            </span>
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "font-mono tabular-nums",
              cancelled
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : attended
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                  : "border-sky-200 bg-sky-100 text-sky-800",
            )}
          >
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {appointments.length === 0 ? (
          <p
            className={cn(
              "py-10 text-center text-sm",
              cancelled
                ? "text-destructive/70"
                : attended
                  ? "text-emerald-700/70"
                  : "text-sky-700/70",
            )}
          >
            {emptyMessage}
          </p>
        ) : (
          <ul
            className={cn(
              "divide-y",
              cancelled
                ? "divide-destructive/20"
                : attended
                  ? "divide-emerald-200/50"
                  : "divide-sky-200/50",
            )}
          >
            {appointments.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-200 sm:px-5",
                  cancelled
                    ? "opacity-75 line-through"
                    : attended
                      ? "hover:bg-emerald-50/80"
                      : "hover:bg-sky-50/80",
                )}
              >
                <time className="w-14 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                  {a.start_time.slice(0, 5)}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {a.patients?.full_name ?? "Paciente"}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.rooms?.name ?? "—"}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    cancelled || a.status === "cancelled"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : attended
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : a.status === "in_progress"
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-sky-200 bg-white/70 text-sky-800",
                  )}
                >
                  {APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status}
                </Badge>
                {!cancelled && a.patient_id && a.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/professional/patients/$id/record",
                        params: { id: a.patient_id! },
                        search: { appointment: a.id },
                      })
                    }
                  >
                    <PlayCircle className="mr-1 size-4" />
                    Iniciar
                  </Button>
                )}
                {!cancelled && a.patient_id && attended && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      navigate({
                        to: "/professional/patients/$id/record",
                        params: { id: a.patient_id! },
                        search: { appointment: a.id },
                      })
                    }
                  >
                    <Eye className="mr-1 size-4" />
                    Prontuário
                  </Button>
                )}
                {!cancelled && a.patient_id && !attended && a.status !== "in_progress" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ver prontuário"
                    onClick={() =>
                      navigate({
                        to: "/professional/patients/$id/record",
                        params: { id: a.patient_id! },
                        search: { appointment: a.id },
                      })
                    }
                  >
                    <FileText className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
