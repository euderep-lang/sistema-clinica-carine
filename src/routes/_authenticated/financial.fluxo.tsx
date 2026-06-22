import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { FluxoCashFlowReport } from "@/components/reports/fluxo-cash-flow-report";

export const Route = createFileRoute("/_authenticated/financial/fluxo")({
  component: () => (
    <DashboardShell title="Fluxo de Caixa">
      <FluxoCashFlowReport />
    </DashboardShell>
  ),
});
