import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FinancialNav, type FinancialTab } from "@/components/professional/financial-nav";
import type { FinancialScope } from "@/lib/financial-scope";

export function FinancialShell({
  scope,
  activeTab,
  onTabChange,
  children,
}: {
  scope: FinancialScope;
  activeTab: FinancialTab;
  onTabChange: (tab: FinancialTab) => void;
  children: ReactNode;
}) {
  const isClinic = scope === "clinic";

  return (
    <DashboardShell title="Financeiro" fullWidth>
      <div className="space-y-6">
        <PageHeader
          title={isClinic ? "Financeiro da clínica" : "Meu financeiro"}
          description={
            isClinic
              ? "Cobranças, caixa, despesas e relatórios de todos os profissionais e da recepção."
              : "Cobranças, caixa do dia, despesas e relatórios do seu consultório."
          }
        />
        <FinancialNav activeTab={activeTab} onTabChange={onTabChange} />
        {children}
      </div>
    </DashboardShell>
  );
}
