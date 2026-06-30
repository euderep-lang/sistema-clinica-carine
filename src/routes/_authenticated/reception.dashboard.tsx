import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Ban,
  Cake,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Inbox,
  MessageSquare,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { ReceptionDaySummaryCards } from "@/components/reception/reception-day-summary-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/appointment-types";
import { openCrmInbox } from "@/lib/crm-navigation";
import {
  fmtDateLong,
  getZonedTimeParts,
  todayISO,
  tomorrowISO,
} from "@/lib/locale";
import { useAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";
import { fetchWaUnreadBadgeCount } from "@/lib/wa-unread-badge";
import { getWaTasks } from "@/lib/whatsapp-crm.functions";

export const Route = createFileRoute("/_authenticated/reception/dashboard")({
  component: ReceptionDashboard,
});

type TodayAppt = {
  id: string;
  patient_id: string | null;
  start_time: string;
  status: string | null;
  patients: { full_name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
  rooms: { name: string } | null;
};

type TomorrowAppt = {
  id: string;
  start_time: string;
  status: string;
  patients: { full_name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
};

type WaTaskRow = {
  id: string;
  title: string;
  due_at: string;
  priority: string;
  task_type: string;
  conversation_id: string | null;
};

function ReceptionDashboard() {
  const navigate = useNavigate();
  const { profile, tenant } = useAuth();
  const loadTasksFn = useServerFn(getWaTasks);

  const [loading, setLoading] = useState(true);
  const [todayAppts, setTodayAppts] = useState<TodayAppt[]>([]);
  const [tomorrowAppts, setTomorrowAppts] = useState<TomorrowAppt[]>([]);
  const [openConvCount, setOpenConvCount] = useState(0);
  const [waUnreadTotal, setWaUnreadTotal] = useState(0);
  const [waTasks, setWaTasks] = useState<WaTaskRow[]>([]);
  const [birthdaysToday, setBirthdaysToday] = useState(0);
  const [birthdayNames, setBirthdayNames] = useState<string[]>([]);
  const [sentToday, setSentToday] = useState(0);

  const load = useCallback(async () => {
    if (!tenant?.id || !profile?.id) return;
    setLoading(true);

    const todayStr = todayISO();
    const tomorrow = tomorrowISO();
    const startOfDay = `${todayStr}T03:00:00.000Z`;
    const { month, day } = getZonedTimeParts();

    const [
      apptRes,
      tomorrowRes,
      openRes,
      ptsRes,
      msgsRes,
      tasksRes,
      badgeCount,
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, patient_id, start_time, status, patients(full_name, phone), profiles:professional_id(full_name), rooms(name)",
        )
        .eq("date", todayStr)
        .order("start_time"),
      supabase
        .from("appointments")
        .select(
          "id, start_time, status, patients(full_name, phone), profiles:professional_id(full_name)",
        )
        .eq("date", tomorrow)
        .in("status", ["scheduled", "confirmed"])
        .order("start_time")
        .limit(12),
      supabase
        .from("wa_conversations" as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "open"),
      supabase
        .from("patients")
        .select("full_name, birth_date")
        .eq("active", true)
        .not("birth_date", "is", null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("message_logs")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", startOfDay),
      loadTasksFn({ data: { onlyOpen: true } }).catch(() => [] as WaTaskRow[]),
      fetchWaUnreadBadgeCount(tenant.id, profile.id, profile.role),
    ]);

    setTodayAppts((apptRes.data ?? []) as unknown as TodayAppt[]);
    setTomorrowAppts((tomorrowRes.data ?? []) as unknown as TomorrowAppt[]);
    setOpenConvCount(openRes.count ?? 0);
    setWaUnreadTotal(badgeCount);
    setSentToday(msgsRes.count ?? 0);
    setWaTasks((tasksRes ?? []) as WaTaskRow[]);

    const bdayPatients = (ptsRes.data ?? []).filter((p) => {
      const bd = (p.birth_date as string).slice(5, 10);
      const [m, d] = bd.split("-").map(Number);
      return m === month && d === day;
    });
    setBirthdaysToday(bdayPatients.length);
    setBirthdayNames(bdayPatients.slice(0, 4).map((p) => p.full_name as string));

    setLoading(false);
  }, [tenant?.id, profile?.id, profile?.role, loadTasksFn]);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [load]);

  const greeting = useMemo(() => {
    const h = getZonedTimeParts().hour;
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const nowTime = new Date().toTimeString().slice(0, 5);

  const stats = useMemo(() => {
    const list = todayAppts;
    return {
      total: list.filter((a) => a.status !== "cancelled" && a.status !== "blocked").length,
      confirmed: list.filter((a) => a.status === "confirmed").length,
      scheduled: list.filter((a) => a.status === "scheduled").length,
      inProgress: list.filter((a) => a.status === "in_progress").length,
      completed: list.filter((a) => a.status === "completed").length,
      cancelled: list.filter((a) => a.status === "cancelled").length,
      noShow: list.filter((a) => a.status === "no_show").length,
    };
  }, [todayAppts]);

  const { upcoming, inProgressOrDone, cancelledOrNoShow, nextAppt } = useMemo(() => {
    const done = new Set(["completed", "no_show"]);
    const upcomingList = todayAppts.filter(
      (a) =>
        !done.has(a.status ?? "") &&
        a.status !== "cancelled" &&
        a.status !== "in_progress",
    );
    const inProg = todayAppts.filter(
      (a) => a.status === "in_progress" || a.status === "completed",
    );
    const cancelledList = todayAppts.filter(
      (a) => a.status === "cancelled" || a.status === "no_show",
    );
    const next = upcomingList.find((a) => (a.start_time ?? "") >= nowTime) ?? upcomingList[0] ?? null;
    return {
      upcoming: upcomingList,
      inProgressOrDone: inProg,
      cancelledOrNoShow: cancelledList,
      nextAppt: next,
    };
  }, [todayAppts, nowTime]);

  const tomorrowUnconfirmed = tomorrowAppts.filter((a) => a.status === "scheduled");
  const overdueTasks = waTasks.filter((t) => t.due_at.slice(0, 19) < new Date().toISOString().slice(0, 19));

  return (
    <DashboardShell title="Painel da Recepção">
      <PageHeader
        title={`${greeting}!`}
        description={`${fmtDateLong(todayISO())} · Visão operacional do dia na recepção.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/reception/checkin">
                <ClipboardCheck className="mr-2 size-4" />
                Check-in
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reception/agenda">
                <CalendarCheck className="mr-2 size-4" />
                Agenda
              </Link>
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
              <Link to="/crm/inbox">
                <Inbox className="mr-2 size-4" />
                CRM WhatsApp
                {waUnreadTotal > 0 && (
                  <Badge className="ml-2 bg-white/20 text-white hover:bg-white/20">
                    {waUnreadTotal}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        }
      />

      {waUnreadTotal > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                {waUnreadTotal} mensagem{waUnreadTotal !== 1 ? "ns" : ""} não lida
                {waUnreadTotal !== 1 ? "s" : ""} no CRM
              </p>
              <p className="text-xs text-emerald-800/80">
                {overdueTasks.length > 0
                  ? `${overdueTasks.length} tarefa${overdueTasks.length !== 1 ? "s" : ""} atrasada${overdueTasks.length !== 1 ? "s" : ""} no CRM`
                  : "Responda pelo inbox para manter o atendimento em dia"}
              </p>
            </div>
          </div>
          <Button size="sm" className="mt-3 shrink-0 bg-emerald-600 hover:bg-emerald-700 sm:mt-0" asChild>
            <Link to="/crm/inbox">Abrir inbox</Link>
          </Button>
        </div>
      )}

      <PageSection title="Resumo do dia">
        <ReceptionDaySummaryCards
          rows={todayAppts}
          loading={loading}
          nextApptTime={nextAppt?.start_time.slice(0, 5) ?? null}
          cancelledCount={stats.cancelled}
          noShowCount={stats.noShow}
        />
      </PageSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <PageSection title="CRM WhatsApp">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Não lidas"
              value={loading ? "—" : waUnreadTotal}
              icon={Inbox}
              tone={waUnreadTotal > 0 ? "warning" : "default"}
              onClick={() => navigate({ to: "/crm/inbox" })}
            />
            <StatCard
              label="Conversas abertas"
              value={loading ? "—" : openConvCount}
              icon={MessageSquare}
              onClick={() => navigate({ to: "/crm/inbox" })}
            />
            <StatCard
              label="Tarefas pendentes"
              value={loading ? "—" : waTasks.length}
              icon={AlertCircle}
              tone={overdueTasks.length > 0 ? "danger" : waTasks.length > 0 ? "warning" : "default"}
              sub={overdueTasks.length > 0 ? `${overdueTasks.length} atrasada(s)` : undefined}
              onClick={() => navigate({ to: "/crm/inbox" })}
            />
          </div>

          {waTasks.length > 0 ? (
            <Card className="mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Tarefas do CRM</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                {waTasks.slice(0, 5).map((t) => {
                  const overdue = t.due_at.slice(0, 19) < new Date().toISOString().slice(0, 19);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                      onClick={() =>
                        t.conversation_id
                          ? openCrmInbox(navigate, { conversationId: t.conversation_id })
                          : navigate({ to: "/crm/inbox" })
                      }
                    >
                      <span className="min-w-0 truncate font-medium">{t.title}</span>
                      <Badge variant={overdue ? "destructive" : "secondary"} className="shrink-0 text-xs">
                        {overdue ? "Atrasada" : "Pendente"}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="mt-4">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma tarefa pendente no CRM.
              </CardContent>
            </Card>
          )}
        </PageSection>

        <PageSection title="Comunicações">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatCard
              label="Aniversariantes hoje"
              value={loading ? "—" : birthdaysToday}
              icon={Cake}
              sub={
                birthdayNames.length > 0
                  ? birthdayNames.join(", ") + (birthdaysToday > birthdayNames.length ? "…" : "")
                  : undefined
              }
              onClick={() => navigate({ to: "/reception/marketing" })}
              action={
                birthdaysToday > 0 ? (
                  <span className="text-xs font-medium text-primary">Ver campanhas →</span>
                ) : undefined
              }
            />
            <StatCard
              label="Mensagens enviadas hoje"
              value={loading ? "—" : sentToday}
              icon={MessageSquare}
              tone="success"
              onClick={() => navigate({ to: "/reception/mensagens" })}
              action={
                <span className="text-xs font-medium text-primary">Ver histórico →</span>
              }
            />
          </div>
        </PageSection>
      </div>

      <div className="space-y-6">
        <PageSection
          title="Agenda de hoje"
            description="Horários, profissionais e situação de cada consulta."
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to="/reception/checkin">Ir para check-in</Link>
              </Button>
            }
          >
            <div
              className={cn(
                "grid gap-4",
                cancelledOrNoShow.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2",
              )}
            >
              <ApptGroup
                title="Próximas"
                count={upcoming.length}
                emptyMessage="Nenhuma consulta pendente hoje"
                appointments={upcoming}
                variant="upcoming"
                onOpenCheckin={() => navigate({ to: "/reception/checkin" })}
              />
              <ApptGroup
                title="Em atendimento / concluídas"
                count={inProgressOrDone.length}
                emptyMessage="Nenhuma consulta iniciada ainda"
                appointments={inProgressOrDone}
                variant="done"
                onOpenCheckin={() => navigate({ to: "/reception/checkin" })}
              />
              {cancelledOrNoShow.length > 0 && (
                <ApptGroup
                  title="Canceladas / faltas"
                  count={cancelledOrNoShow.length}
                  emptyMessage="Nenhum cancelamento hoje"
                  appointments={cancelledOrNoShow}
                  variant="cancelled"
                  onOpenCheckin={() => navigate({ to: "/reception/checkin" })}
                />
              )}
            </div>
          </PageSection>

          <PageSection
            title="Amanhã — confirmações pendentes"
            description={`${tomorrowUnconfirmed.length} consulta${tomorrowUnconfirmed.length !== 1 ? "s" : ""} ainda sem confirmação do paciente.`}
            actions={
              <Button variant="outline" size="sm" asChild>
                <Link to="/reception/mensagens">Enviar lembretes</Link>
              </Button>
            }
          >
            {tomorrowUnconfirmed.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Todas as consultas de amanhã já estão confirmadas ou não há agendamentos.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {tomorrowUnconfirmed.slice(0, 8).map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                      >
                        <time className="w-14 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                          {a.start_time.slice(0, 5)}
                        </time>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {a.patients?.full_name ?? "Paciente"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.profiles?.full_name ?? "Profissional"}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                          Aguardando
                        </Badge>
                        {a.patients?.phone && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() =>
                              openCrmInbox(navigate, { phone: a.patients!.phone })
                            }
                          >
                            <MessageSquare className="size-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </PageSection>
      </div>
    </DashboardShell>
  );
}

function ApptGroup({
  title,
  count,
  emptyMessage,
  appointments,
  variant,
  onOpenCheckin,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  appointments: TodayAppt[];
  variant: "upcoming" | "done" | "cancelled";
  onOpenCheckin: () => void;
}) {
  const navigate = useNavigate();
  const Icon = variant === "cancelled" ? Ban : variant === "done" ? CheckCircle2 : Clock;

  return (
    <Card
      className={cn(
        "overflow-hidden ring-1 ring-inset",
        variant === "cancelled"
          ? "border-destructive/30 bg-destructive/5 ring-destructive/20"
          : variant === "done"
            ? "border-emerald-200/70 bg-emerald-50/30 ring-emerald-100"
            : "border-sky-200/70 bg-sky-50/40 ring-sky-100",
      )}
    >
      <CardHeader
        className={cn(
          "border-b pb-3",
          variant === "cancelled"
            ? "border-destructive/20 bg-destructive/5"
            : variant === "done"
              ? "border-emerald-200/60 bg-emerald-50/80"
              : "border-sky-200/60 bg-sky-50/80",
        )}
      >
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full",
                variant === "cancelled"
                  ? "bg-destructive/10 text-destructive"
                  : variant === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700",
              )}
            >
              <Icon className="size-4" />
            </span>
            {title}
          </span>
          <Badge variant="secondary" className="font-mono tabular-nums">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {appointments.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="divide-y">
            {appointments.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4",
                  variant === "cancelled" && "opacity-80",
                )}
              >
                <time className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {a.start_time.slice(0, 5)}
                </time>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      variant === "cancelled" && "line-through",
                    )}
                  >
                    {a.patients?.full_name ?? "Paciente"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.profiles?.full_name ?? "—"}
                    {a.rooms?.name ? ` · ${a.rooms.name}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {APPOINTMENT_STATUS_LABEL[a.status ?? ""] ?? a.status}
                </Badge>
                {variant === "upcoming" && a.patients?.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    title="WhatsApp"
                    onClick={() => openCrmInbox(navigate, { phone: a.patients!.phone })}
                  >
                    <MessageSquare className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {appointments.length > 0 && variant === "upcoming" && (
          <div className="border-t px-3 py-2">
            <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={onOpenCheckin}>
              Confirmar chegada no check-in
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
