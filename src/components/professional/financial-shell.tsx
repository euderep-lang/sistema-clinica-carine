import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FinancialNav, type FinancialTab } from "@/components/professional/financial-nav";

export function FinancialShell({
  activeTab,
  onTabChange,
  children,
}: {
  activeTab: FinancialTab;
  onTabChange: (tab: FinancialTab) => void;
  children: ReactNode;
}) {
  return (
    <DashboardShell title="Financeiro">
      <div className="space-y-6">
        <PageHeader
          title="Meu financeiro"
          description="Cobranças, caixa do dia, despesas e relatórios do seu consultório."
        />
        <FinancialNav activeTab={activeTab} onTabChange={onTabChange} />
        {children}
      </div>
    </DashboardShell>
  );
}
