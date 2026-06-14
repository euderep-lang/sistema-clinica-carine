import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SectionMeusProcedimentos } from "@/components/professional/section-meus-procedimentos";

export const Route = createFileRoute("/_authenticated/professional/procedimentos")({
  component: ProfessionalProcedimentosPage,
});

function ProfessionalProcedimentosPage() {
  return (
    <DashboardShell title="Procedimentos">
      <div className="space-y-6">
        <PageHeader
          title="Meus procedimentos"
          description="Cadastre serviços e procedimentos com preço, pacotes de sessões e insumos de estoque."
        />
        <SectionMeusProcedimentos />
      </div>
    </DashboardShell>
  );
}
