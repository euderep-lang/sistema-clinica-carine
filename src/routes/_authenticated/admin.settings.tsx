import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Palette, DoorOpen, Stethoscope, Users, Receipt, MessageSquare, Plug, CreditCard, FolderOpen, type LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { cn } from "@/lib/utils";
import { SectionClinica } from "@/components/settings/section-clinica";
import { SectionAparencia } from "@/components/settings/section-aparencia";
import { SectionConsultorios } from "@/components/settings/section-consultorios";
import { SectionEspecialidades } from "@/components/settings/section-especialidades";
import { SectionUsuarios } from "@/components/settings/section-usuarios";
import { SectionServicos } from "@/components/settings/section-servicos";
import { SectionMensagens } from "@/components/settings/section-mensagens";
import { SectionIntegracoes } from "@/components/settings/section-integracoes";
import { SectionPagamentos } from "@/components/settings/section-pagamentos";
import { SectionDespesas } from "@/components/settings/section-despesas";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Page });

type SectionId = "clinica" | "aparencia" | "consultorios" | "especialidades" | "usuarios" | "servicos" | "pagamentos" | "despesas" | "mensagens" | "integracoes";

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "clinica", label: "Clínica", icon: Building2 },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "consultorios", label: "Consultórios", icon: DoorOpen },
  { id: "especialidades", label: "Especialidades", icon: Stethoscope },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "servicos", label: "Serviços", icon: Receipt },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "despesas", label: "Despesas", icon: FolderOpen },
  { id: "mensagens", label: "Modelos de Mensagem", icon: MessageSquare },
  { id: "integracoes", label: "Integrações", icon: Plug },
];

function Page() {
  const [active, setActive] = useState<SectionId>("clinica");
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
          {active === "usuarios" && <SectionUsuarios />}
          {active === "servicos" && <SectionServicos />}
          {active === "pagamentos" && <SectionPagamentos />}
          {active === "despesas" && <SectionDespesas />}
          {active === "mensagens" && <SectionMensagens />}
          {active === "integracoes" && <SectionIntegracoes />}
        </div>
      </div>
    </DashboardShell>
  );
}