import type { ReactNode } from "react";
import { Outlet } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FinancialNav } from "@/components/professional/financial-nav";

export function FinancialShell({ children }: { children: ReactNode }) {
  return (
    <DashboardShell title="Financeiro">
      <div className="space-y-6">
        <PageHeader
          title="Meu financeiro"
          description="Cobranças, caixa do dia, despesas e relatórios do seu consultório."
        />
        <FinancialNav />
        {children}
      </div>
    </DashboardShell>
  );
}

export function FinancialLayout() {
  return <Outlet />;
}
