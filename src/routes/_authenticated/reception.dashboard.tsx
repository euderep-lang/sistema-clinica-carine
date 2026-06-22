import { getZonedTimeParts, todayISO, tomorrowISO } from "@/lib/locale";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cake, CalendarCheck, MessageSquare } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reception/dashboard")({
  component: ReceptionDashboard,
});

function ReceptionDashboard() {
  const navigate = useNavigate();
  const [birthdaysToday, setBirthdaysToday] = useState(0);
  const [unconfirmed, setUnconfirmed] = useState(0);
  const [sentToday, setSentToday] = useState(0);

  useEffect(() => {
    (async () => {
      const { month, day } = getZonedTimeParts();
      const tomorrow = tomorrowISO();
      const startOfDay = `${todayISO()}T03:00:00.000Z`;

      const { data: pts } = await supabase
        .from("patients")
        .select("birth_date")
        .not("birth_date", "is", null);
      const bday = (pts ?? []).filter((p) => {
        const bd = (p.birth_date as string).slice(5, 10);
        const [m, d] = bd.split("-").map(Number);
        return m === month && d === day;
      }).length;
      setBirthdaysToday(bday);

      const { count: unc } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("date", tomorrow)
        .eq("status", "scheduled");
      setUnconfirmed(unc ?? 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: msgs } = await (supabase as any)
        .from("message_logs")
        .select("id", { count: "exact", head: true })
        .gte("sent_at", startOfDay);
      setSentToday(msgs ?? 0);
    })();
  }, []);

  const greeting = (() => {
    const h = getZonedTimeParts().hour;
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <DashboardShell title="Painel da Recepção">
      <PageHeader
        title={`${greeting}!`}
        description="Acompanhe comunicações e pendências do dia na recepção."
      />

      <PageSection
        title="Comunicações"
        description="Métricas de engajamento e lembretes para pacientes."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Aniversariantes hoje"
            value={birthdaysToday}
            icon={Cake}
            tone="default"
            onClick={() => navigate({ to: "/reception/marketing" })}
            action={
              <span className="text-xs font-medium text-primary">Ver campanhas →</span>
            }
          />
          <StatCard
            label="Sem confirmação (amanhã)"
            value={unconfirmed}
            icon={CalendarCheck}
            tone={unconfirmed > 0 ? "warning" : "default"}
            onClick={() => navigate({ to: "/reception/mensagens" })}
            action={
              <span className="text-xs font-medium text-muted-foreground">Enviar lembretes</span>
            }
          />
          <StatCard
            label="Mensagens enviadas hoje"
            value={sentToday}
            icon={MessageSquare}
            tone="success"
            onClick={() => navigate({ to: "/reception/mensagens" })}
            action={
              <span className="text-xs font-medium text-primary">Ver histórico →</span>
            }
          />
        </div>
      </PageSection>
    </DashboardShell>
  );
}
