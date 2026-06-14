import { createFileRoute } from "@tanstack/react-router";
import { FinancialShell } from "@/components/professional/financial-shell";
import { ProfessionalFinancialReports } from "@/components/professional/professional-financial-reports";

export const Route = createFileRoute("/_authenticated/professional/financial/relatorios")({
  component: ProfessionalRelatoriosPage,
});

function ProfessionalRelatoriosPage() {
  return (
    <FinancialShell>
      <ProfessionalFinancialReports />
    </FinancialShell>
  );
}
