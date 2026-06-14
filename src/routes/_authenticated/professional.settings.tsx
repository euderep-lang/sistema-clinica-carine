import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, FileImage, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SectionAgendaTipos } from "@/components/professional/section-agenda-tipos";
import { SectionCertificadoDigital } from "@/components/professional/section-certificado-digital";
import { SectionPapelTimbrado } from "@/components/professional/section-papel-timbrado";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/professional/settings")({
  component: ProfessionalSettingsPage,
});

type TabId = "agenda" | "timbrado" | "certificado";

const TABS: { id: TabId; label: string; icon: LucideIcon; description: string }[] = [
  {
    id: "agenda",
    label: "Tipos de agendamento",
    icon: Calendar,
    description: "Consulta, retorno, procedimento, exame — o que aparece na agenda da recepção.",
  },
  {
    id: "timbrado",
    label: "Papel timbrado",
    icon: FileImage,
    description: "Imagem do timbrado e margens para receitas e documentos impressos.",
  },
  {
    id: "certificado",
    label: "Certificado digital",
    icon: ShieldCheck,
    description: "Certificado A1 ou em nuvem SafeID para assinar receitas com validade ICP-Brasil.",
  },
];

function ProfessionalSettingsPage() {
  const [tab, setTab] = useState<TabId>("agenda");

  return (
    <DashboardShell title="Minhas configurações">
      <div className="space-y-6">
        <PageHeader
          title="Minhas configurações"
          description="Tipos de agendamento, papel timbrado e certificado digital do seu consultório."
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          <nav className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-56 lg:flex-col">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex min-w-[12rem] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                  tab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Settings className="size-4" />
              {TABS.find((t) => t.id === tab)?.description}
            </div>
            {tab === "agenda" && <SectionAgendaTipos />}
            {tab === "timbrado" && <SectionPapelTimbrado />}
            {tab === "certificado" && <SectionCertificadoDigital />}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
