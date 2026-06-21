import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  CalendarCheck,
  Clock,
  MessageCircle,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrmAnalytics } from "@/lib/whatsapp-crm.functions";
import { useAuth } from "@/lib/mock-auth";

type Analytics = Awaited<ReturnType<typeof getCrmAnalytics>>;

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: typeof BarChart3;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function CrmAnalyticsPage() {
  const { profile } = useAuth();
  const analyticsFn = useServerFn(getCrmAnalytics);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void analyticsFn()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [analyticsFn]);

  if (profile?.role !== "admin") {
    return (
      <DashboardShell>
        <PageHeader title="Métricas CRM" description="Acesso restrito ao administrador." />
        <p className="text-sm text-muted-foreground">Você não tem permissão para ver esta página.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Métricas CRM"
        description="Indicadores dos últimos 30 dias — leads, conversão e desempenho da equipe."
        actions={
          <Link
            to="/crm/inbox"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted/60"
          >
            Voltar ao inbox
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando métricas…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Leads recebidos"
              value={String(data.totals.leads)}
              hint={`${data.totals.conversations} conversas no período`}
              icon={Users}
            />
            <MetricCard
              title="1ª resposta (média)"
              value={data.avgFirstResponseMinutes != null ? `${data.avgFirstResponseMinutes} min` : "—"}
              hint="Tempo até primeiro contato da equipe"
              icon={Clock}
            />
            <MetricCard
              title="Taxa resposta do lead"
              value={`${data.leadResponseRate}%`}
              hint="Pacientes que responderam após contato"
              icon={MessageCircle}
            />
            <MetricCard
              title="Taxa de agendamento"
              value={`${data.schedulingRate}%`}
              hint="Consultas vs conversas"
              icon={CalendarCheck}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Comparecimento"
              value={data.attendanceRate != null ? `${data.attendanceRate}%` : "—"}
              hint="Realizadas vs faltas"
              icon={UserCheck}
            />
            <MetricCard
              title="Fechamento pós-valor"
              value={data.closeRateAfterPrice != null ? `${data.closeRateAfterPrice}%` : "—"}
              hint="Agendaram após receber valor"
              icon={Target}
            />
            <MetricCard
              title="Agendamentos"
              value={String(data.totals.appointments)}
              hint={`${data.totals.pricedConversations} conversas com valor enviado`}
              icon={TrendingUp}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leads por dia</CardTitle>
              </CardHeader>
              <CardContent>
                {data.leadsPerDay.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lead no período.</p>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                    {data.leadsPerDay.map(({ date, count }) => (
                      <li key={date} className="flex justify-between rounded-md px-2 py-1 hover:bg-muted/40">
                        <span>{date.split("-").reverse().join("/")}</span>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Motivos de perda</CardTitle>
              </CardHeader>
              <CardContent>
                {data.lossReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma conversa fechada no período.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.lossReasons.map(({ reason, count }) => (
                      <li key={reason} className="flex items-center justify-between gap-2">
                        <span className="truncate">{reason}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                          {count}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maior conversão (equipe)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topConverters.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de conversão ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.topConverters.map((s, i) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span>
                        <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                        {s.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.deals} ganhos · {s.appointments} agendamentos
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}
