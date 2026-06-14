import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cake, CalendarCheck, MessageSquare } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { PageSection } from "@/components/layout/page-section";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reception/dashboard")({
  component: ReceptionDashboard,
});

function ReceptionDashboard() {
  const [birthdaysToday, setBirthdaysToday] = useState(0);
  const [unconfirmed, setUnconfirmed] = useState(0);
  const [sentToday, setSentToday] = useState(0);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data: pts } = await supabase
        .from("patients")
        .select("birth_date")
        .not("birth_date", "is", null);
      const bday = (pts ?? []).filter((p) => {
        const d = new Date(p.birth_date as string);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
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
    const h = new Date().getHours();
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
            action={
              <Link
                to="/reception/marketing"
                className="text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
              >
                Ver campanhas →
              </Link>
            }
          />
          <StatCard
            label="Sem confirmação (amanhã)"
            value={unconfirmed}
            icon={CalendarCheck}
            tone={unconfirmed > 0 ? "warning" : "default"}
            action={
              <Link to="/reception/mensagens">
                <Button size="sm" variant="outline">
                  Enviar lembretes
                </Button>
              </Link>
            }
          />
          <StatCard
            label="Mensagens enviadas hoje"
            value={sentToday}
            icon={MessageSquare}
            tone="success"
            action={
              <Link
                to="/reception/mensagens"
                className="text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80"
              >
                Ver histórico →
              </Link>
            }
          />
        </div>
      </PageSection>
    </DashboardShell>
  );
}
