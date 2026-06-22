import { lazy, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import { FinancialShell } from "@/components/professional/financial-shell";
import type { FinancialTab } from "@/components/professional/financial-nav";
import type { FinancialScope } from "@/lib/financial-scope";

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
const FinancialComissaoTab = lazy(() =>
  import("@/components/professional/financial-comissao-tab").then((m) => ({
    default: m.FinancialComissaoTab,
  })),
);
const ProfessionalFinancialReports = lazy(() =>
  import("@/components/professional/professional-financial-reports").then((m) => ({
    default: m.ProfessionalFinancialReports,
  })),
);

function TabFallback() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function FinancialPage({ scope }: { scope: FinancialScope }) {
  const [tab, setTab] = useState<FinancialTab>("cobrancas");
  const [professionalFilter, setProfessionalFilter] = useState("all");

  const tabProps = { scope, professionalFilter, onProfessionalFilterChange: setProfessionalFilter };

  return (
    <FinancialShell scope={scope} activeTab={tab} onTabChange={setTab}>
      <Suspense fallback={<TabFallback />}>
        {tab === "cobrancas" && <FinancialCobrancasTab {...tabProps} />}
        {tab === "caixa" && <FinancialCaixaTab {...tabProps} />}
        {tab === "despesas" && <FinancialDespesasTab {...tabProps} />}
        {tab === "comissao" && <FinancialComissaoTab {...tabProps} />}
        {tab === "relatorios" && <ProfessionalFinancialReports {...tabProps} />}
      </Suspense>
    </FinancialShell>
  );
}
