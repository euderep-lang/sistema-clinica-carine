import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, firstDayOfMonth, todayISO } from "@/components/professional/date-range-filter";
import { CommissionReportPanel } from "@/components/professional/financial-report-panels";
import { FinancialProfessionalFilter } from "@/components/professional/financial-professional-filter";
import { useAuth } from "@/lib/mock-auth";
import type { ReportQueryCtx } from "@/lib/financial-reports";
import type { FinancialTabScopeProps } from "@/lib/financial-scope";

export function FinancialComissaoTab({
  scope,
  professionalFilter,
  onProfessionalFilterChange,
}: FinancialTabScopeProps) {
  const { profile } = useAuth();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [queryCtx, setQueryCtx] = useState<ReportQueryCtx | null>(null);

  const load = useCallback(() => {
    if (!profile) return;
    if (from > to) {
      toast.error("A data inicial não pode ser maior que a final");
      return;
    }
    setQueryCtx({
      scope,
      profileId: profile.id,
      filters: {
        from,
        to,
        professionalFilter: scope === "clinic" ? professionalFilter : profile.id,
        statusFilter: "all",
        periodGranularity: "month",
      },
    });
  }, [profile, from, to, scope, professionalFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        {scope === "clinic" && (
          <FinancialProfessionalFilter
            value={professionalFilter}
            onChange={onProfessionalFilterChange}
          />
        )}
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 size-4" />
          Atualizar
        </Button>
        {from > to && (
          <p className="w-full text-sm text-destructive">
            A data inicial não pode ser maior que a final.
          </p>
        )}
      </div>

      {queryCtx && from <= to ? <CommissionReportPanel ctx={queryCtx} /> : null}
    </div>
  );
}
