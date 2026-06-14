import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { AdminMasterDashboard } from "@/components/admin/admin-master-dashboard";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <DashboardShell title="Painel do Administrador">
      <AdminMasterDashboard />
    </DashboardShell>
  );
}
