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
import { CrmPageShell } from "@/components/crm/crm-pwa-shell";
import { useCrmPwaMode } from "@/components/crm/use-crm-pwa-mode";
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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm font-medium text-muted-foreground">{title}</p>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
            <Icon className="size-4" />
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function CrmAnalyticsPage() {
  const { profile } = useAuth();
  const pwaMode = useCrmPwaMode();
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
      <CrmPageShell title="Métricas CRM" pwa={pwaMode ? { activeTab: "analytics", header: { title: "Métricas" } } : undefined}>
        <PageHeader title="Métricas CRM" description="Acesso restrito ao administrador." />
        <p className="p-4 text-sm text-muted-foreground">Você não tem permissão para ver esta página.</p>
      </CrmPageShell>
    );
  }

  return (
    <CrmPageShell
      title="Métricas CRM"
      pwa={pwaMode ? { activeTab: "analytics", header: { title: "Métricas CRM" } } : undefined}
    >
      {!pwaMode ? (
      <PageHeader
        title="Métricas CRM"
        description="Indicadores dos últimos 30 dias — conversão do CRM (agendamentos feitos pelo inbox)."
        actions={
          <Link
            to="/crm/inbox"
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted/60"
          >
            Voltar ao inbox
          </Link>
        }
      />
      ) : null}

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
              title="Taxa de conversão CRM"
              value={`${data.crmConversionRate}%`}
              hint={`${data.totals.conversationsWithCrmBooking} de ${data.totals.conversations} conversas geraram agendamento pelo CRM`}
              icon={CalendarCheck}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Comparecimento (CRM)"
              value={data.attendanceRate != null ? `${data.attendanceRate}%` : "—"}
              hint="Consultas CRM realizadas vs faltas"
              icon={UserCheck}
            />
            <MetricCard
              title="Fechamento pós-valor"
              value={data.closeRateAfterPrice != null ? `${data.closeRateAfterPrice}%` : "—"}
              hint="Conversas com preço que viraram agendamento CRM depois"
              icon={Target}
            />
            <MetricCard
              title="Agendamentos pelo CRM"
              value={String(data.totals.crmAppointments)}
              hint={`${data.totals.clinicAppointments} pela agenda (recepção/profissional) · ${data.totals.pricedConversations} com valor enviado`}
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
              <CardTitle className="text-base">Maior conversão CRM (equipe)</CardTitle>
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
                        {s.deals} ganhos · {s.appointments} agend. CRM
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </CrmPageShell>
  );
}
