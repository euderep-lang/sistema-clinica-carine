import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReportsPage } from "@/components/reports/reports-page";

export const Route = createFileRoute("/_authenticated/financial/relatorios")({
  component: () => <DashboardShell title="Relatórios"><ReportsPage /></DashboardShell>,
});