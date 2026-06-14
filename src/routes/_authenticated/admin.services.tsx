import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { SectionServicos } from "@/components/settings/section-servicos";

export const Route = createFileRoute("/_authenticated/admin/services")({ component: Page });

function Page() {
  return <DashboardShell title="Serviços"><SectionServicos /></DashboardShell>;
}