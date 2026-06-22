import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FinancialDespesasTab } from "@/components/professional/financial-despesas-tab";

export const Route = createFileRoute("/_authenticated/financial/payables")({
  component: PayablesPage,
});

function PayablesPage() {
  const [professionalFilter, setProfessionalFilter] = useState("all");
  return (
    <DashboardShell title="Contas a Pagar">
      <FinancialDespesasTab
        scope="clinic"
        professionalFilter={professionalFilter}
        onProfessionalFilterChange={setProfessionalFilter}
      />
    </DashboardShell>
  );
}
