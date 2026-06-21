import { lazy, Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { FinancialShell } from "@/components/professional/financial-shell";
import type { FinancialTab } from "@/components/professional/financial-nav";

const FinancialCobrancasTab = lazy(() =>
  import("@/components/professional/financial-cobrancas-tab").then((m) => ({
    default: m.FinancialCobrancasTab,
  })),
);
const FinancialCaixaTab = lazy(() =>
  import("@/components/professional/financial-caixa-tab").then((m) => ({
    default: m.FinancialCaixaTab,
  })),
);
const FinancialDespesasTab = lazy(() =>
  import("@/components/professional/financial-despesas-tab").then((m) => ({
    default: m.FinancialDespesasTab,
  })),
);
const ProfessionalFinancialReports = lazy(() =>
  import("@/components/professional/professional-financial-reports").then((m) => ({
    default: m.ProfessionalFinancialReports,
  })),
);

export const Route = createFileRoute("/_authenticated/professional/financial")({
  component: ProfessionalFinancialPage,
});

function TabFallback() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProfessionalFinancialPage() {
  const [tab, setTab] = useState<FinancialTab>("cobrancas");

  return (
    <FinancialShell activeTab={tab} onTabChange={setTab}>
      <Suspense fallback={<TabFallback />}>
        {tab === "cobrancas" && <FinancialCobrancasTab />}
        {tab === "caixa" && <FinancialCaixaTab />}
        {tab === "despesas" && <FinancialDespesasTab />}
        {tab === "relatorios" && <ProfessionalFinancialReports />}
      </Suspense>
    </FinancialShell>
  );
}
