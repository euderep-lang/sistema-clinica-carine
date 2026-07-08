import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CalendarClock, Palette, DoorOpen, Stethoscope, Users, Receipt, MessageSquare, Plug, CreditCard, FolderOpen, Shield, ShieldCheck, LineChart, Trash2, type LucideIcon } from "lucide-react";
import { SectionAuditoria } from "@/components/settings/section-auditoria";
import { SectionAgenda } from "@/components/settings/section-agenda";
import { SectionFunilCrm } from "@/components/settings/section-funil-crm";
import { DashboardShell } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";
import { SectionClinica } from "@/components/settings/section-clinica";
import { SectionAparencia } from "@/components/settings/section-aparencia";
import { SectionConsultorios } from "@/components/settings/section-consultorios";
import { SectionEspecialidades } from "@/components/settings/section-especialidades";
import { SectionUsuarios } from "@/components/settings/section-usuarios";
import { SectionPermissoes } from "@/components/settings/section-permissoes";
import { SectionServicos } from "@/components/settings/section-servicos";
import { SectionMensagens } from "@/components/settings/section-mensagens";
import { SectionIntegracoes } from "@/components/settings/section-integracoes";
import { SectionPagamentos } from "@/components/settings/section-pagamentos";
import { SectionDespesas } from "@/components/settings/section-despesas";
import { SectionLixeira } from "@/components/settings/section-lixeira";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search.section === "string" ? search.section : undefined,
  }),
  component: Page,
});

type SectionId = "clinica" | "aparencia" | "consultorios" | "especialidades" | "agenda" | "usuarios" | "permissoes" | "servicos" | "pagamentos" | "despesas" | "mensagens" | "funil" | "integracoes" | "auditoria" | "lixeira";

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "clinica", label: "Clínica", icon: Building2 },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "consultorios", label: "Consultórios", icon: DoorOpen },
  { id: "especialidades", label: "Especialidades", icon: Stethoscope },
  { id: "agenda", label: "Agenda", icon: CalendarClock },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "permissoes", label: "Permissões", icon: ShieldCheck },
  { id: "servicos", label: "Serviços", icon: Receipt },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "despesas", label: "Despesas", icon: FolderOpen },
  { id: "mensagens", label: "Mensagens WhatsApp", icon: MessageSquare },
  { id: "funil", label: "Funil de vendas", icon: LineChart },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "auditoria", label: "Auditoria", icon: Shield },
  { id: "lixeira", label: "Lixeira", icon: Trash2 },
];

function Page() {
  const { section } = Route.useSearch();
  const initial: SectionId =
    section === "funil" ||
    section === "clinica" ||
    section === "aparencia" ||
    section === "consultorios" ||
    section === "especialidades" ||
    section === "agenda" ||
    section === "usuarios" ||
    section === "permissoes" ||
    section === "servicos" ||
    section === "pagamentos" ||
    section === "despesas" ||
    section === "mensagens" ||
    section === "integracoes" ||
    section === "auditoria" ||
    section === "lixeira"
      ? section
      : "clinica";
  const [active, setActive] = useState<SectionId>(initial);
  return (
    <DashboardShell title="Configurações">
      <div className="flex gap-6">
        <nav className="w-60 shrink-0 space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" onClick={() => setActive(s.id)}
              className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition",
                active === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <s.icon className="h-4 w-4" />{s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">
          {active === "clinica" && <SectionClinica />}
          {active === "aparencia" && <SectionAparencia />}
          {active === "consultorios" && <SectionConsultorios />}
          {active === "especialidades" && <SectionEspecialidades />}
          {active === "agenda" && <SectionAgenda />}
          {active === "usuarios" && <SectionUsuarios />}
          {active === "permissoes" && <SectionPermissoes />}
          {active === "servicos" && <SectionServicos />}
          {active === "pagamentos" && <SectionPagamentos />}
          {active === "despesas" && <SectionDespesas />}
          {active === "mensagens" && <SectionMensagens />}
          {active === "funil" && <SectionFunilCrm />}
          {active === "integracoes" && <SectionIntegracoes />}
          {active === "auditoria" && <SectionAuditoria />}
          {active === "lixeira" && <SectionLixeira />}
        </div>
      </div>
    </DashboardShell>
  );
}