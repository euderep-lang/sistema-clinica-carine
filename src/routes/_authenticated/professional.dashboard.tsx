import { useEffect, useMemo, useState } from "react";
import { todayISO } from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
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
import { supabase } from "@/integrations/supabase/client";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/appointment-types";
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

function ProfessionalDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [today, setToday] = useState<TodayAppt[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [pendingRecords, setPendingRecords] = useState(0);
  const [nextAppt, setNextAppt] = useState<TodayAppt | null>(null);
  const [newApptOpen, setNewApptOpen] = useState(false);

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
    const list = (ap ?? []) as unknown as TodayAppt[];
    setToday(list);

    const now = new Date().toTimeString().slice(0, 5);
    const upcoming = list.find(
      (a) =>
        (a.start_time ?? "") >= now &&
        a.status !== "completed" &&
        a.status !== "cancelled",
    );
    setNextAppt(upcoming ?? null);

    const { count: mc } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", profile.id)
      .eq("status", "completed")
      .gte("date", firstOfMonth);
    setMonthCount(mc ?? 0);

    const { data: completed } = await supabase
      .from("appointments")
      .select("id")
      .eq("professional_id", profile.id)
      .eq("status", "completed");
    const ids = (completed ?? []).map((c) => c.id);
    if (ids.length === 0) {
      setPendingRecords(0);
      return;
    }
    const { data: linked } = await supabase
      .from("medical_records")
      .select("appointment_id")
      .in("appointment_id", ids);
    const linkedSet = new Set((linked ?? []).map((l) => l.appointment_id));
    setPendingRecords(ids.filter((i) => !linkedSet.has(i)).length);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const { upcoming, attended } = useMemo(() => {
    const done = new Set(["completed", "cancelled", "no_show"]);
    return {
      upcoming: today.filter((a) => !done.has(a.status ?? "")),
      attended: today.filter((a) => a.status === "completed"),
    };
  }, [today]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "Profissional";

  return (
    <DashboardShell title="Painel do Profissional">
      <PageHeader
        title={`Olá, ${firstName}`}
        description={
          [profile?.specialty, profile?.crm].filter(Boolean).join(" · ") ||
          "Sua agenda e pendências do dia."
        }
        actions={
          <Button onClick={() => setNewApptOpen(true)}>
            <Plus className="mr-2 size-4" />
            Novo agendamento
          </Button>
        }
      />

      <PageSection title="Indicadores do dia">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Consultas hoje" value={today.length} icon={CalIcon} />
          <StatCard
            label="Próxima consulta"
            value={nextAppt ? nextAppt.start_time.slice(0, 5) : "—"}
            sub={
              nextAppt
                ? `${nextAppt.patients?.full_name ?? "Paciente"} · ${nextAppt.rooms?.name ?? ""}`
                : "Sem agendamentos"
            }
            icon={UsersIcon}
          />
          <StatCard label="Atendidos este mês" value={monthCount} icon={UsersIcon} />
          <StatCard
            label="Prontuários pendentes"
            value={pendingRecords}
            icon={AlertCircle}
            tone={pendingRecords > 0 ? "danger" : "default"}
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
        <div className="grid gap-4 lg:grid-cols-2">
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
        </div>
      </PageSection>

      <NewAppointmentDialog
        open={newApptOpen}
        onOpenChange={setNewApptOpen}
        defaultProfessionalId={profile?.role === "professional" ? profile.id : undefined}
        onSaved={() => void load()}
      />
    </DashboardShell>
  );
}

function AgendaGroup({
  title,
  count,
  emptyMessage,
  appointments,
  navigate,
  attended = false,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  appointments: TodayAppt[];
  navigate: ReturnType<typeof useNavigate>;
  attended?: boolean;
}) {
  const Icon = attended ? CheckCircle2 : Clock;

  return (
    <Card
      className={cn(
        "overflow-hidden ring-1 ring-inset",
        attended
          ? "border-emerald-200/70 bg-emerald-50/30 ring-emerald-100"
          : "border-sky-200/70 bg-sky-50/40 ring-sky-100",
      )}
    >
      <CardHeader
        className={cn(
          "border-b pb-4",
          attended
            ? "border-emerald-200/60 bg-emerald-50/80"
            : "border-sky-200/60 bg-sky-50/80",
        )}
      >
        <CardTitle className="flex items-center justify-between text-base font-medium">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full",
                attended ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className={attended ? "text-emerald-900" : "text-sky-900"}>{title}</span>
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "font-mono tabular-nums",
              attended
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
              attended ? "text-emerald-700/70" : "text-sky-700/70",
            )}
          >
            {emptyMessage}
          </p>
        ) : (
          <ul
            className={cn(
              "divide-y",
              attended ? "divide-emerald-200/50" : "divide-sky-200/50",
            )}
          >
            {appointments.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-200 sm:px-5",
                  attended ? "hover:bg-emerald-50/80" : "hover:bg-sky-50/80",
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
                    attended
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : a.status === "in_progress"
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : "border-sky-200 bg-white/70 text-sky-800",
                  )}
                >
                  {APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status}
                </Badge>
                {a.patient_id && a.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/professional/patients/$id/record",
                        params: { id: a.patient_id! },
                      })
                    }
                  >
                    <PlayCircle className="mr-1 size-4" />
                    Iniciar
                  </Button>
                )}
                {a.patient_id && attended && (
                  <Button
                    size="sm"
                    variant="outline"
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
                {a.patient_id && !attended && a.status !== "in_progress" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ver prontuário"
                    onClick={() =>
                      navigate({
                        to: "/professional/patients/$id/record",
                        params: { id: a.patient_id! },
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
