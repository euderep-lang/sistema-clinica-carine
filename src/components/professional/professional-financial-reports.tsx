import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  GitCompare,
  ListOrdered,
  Percent,
  Play,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, firstDayOfMonth, todayISO } from "@/components/professional/date-range-filter";
import { FinancialProfessionalFilter } from "@/components/professional/financial-professional-filter";
import { FinancialReportPanels } from "@/components/professional/financial-report-panels";
import { useAuth } from "@/lib/mock-auth";
import type { FinancialReportFilters, ReportQueryCtx } from "@/lib/financial-reports";
import type { FinancialTabScopeProps } from "@/lib/financial-scope";

type ReportId =
  | "metrics"
  | "dre"
  | "dre-detalhado"
  | "cruzado"
  | "comissao"
  | "vendas-profissional"
  | "vendas-periodo"
  | "pagamento"
  | "top-procedimentos"
  | "producao"
  | "receber"
  | "despesas";

const REPORT_GROUPS: { title: string; items: { id: ReportId; label: string; icon: LucideIcon }[] }[] = [
  {
    title: "Visão geral",
    items: [
      { id: "metrics", label: "Métricas", icon: BarChart3 },
      { id: "dre", label: "DRE", icon: FileSpreadsheet },
      { id: "dre-detalhado", label: "DRE detalhado", icon: FileSpreadsheet },
      { id: "cruzado", label: "Análise cruzada", icon: GitCompare },
    ],
  },
  {
    title: "Vendas",
    items: [
      { id: "vendas-profissional", label: "Por profissional", icon: Users },
      { id: "vendas-periodo", label: "Por período", icon: CalendarDays },
      { id: "pagamento", label: "Por forma de pgto.", icon: CreditCard },
      { id: "top-procedimentos", label: "Top procedimentos", icon: ListOrdered },
      { id: "producao", label: "Produção", icon: Wallet },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { id: "comissao", label: "Comissão", icon: Percent },
      { id: "receber", label: "Contas a receber", icon: TrendingUp },
      { id: "despesas", label: "Despesas", icon: TrendingDown },
    ],
  },
];

function needsStatusFilter(reportId: ReportId) {
  return reportId === "receber" || reportId === "despesas";
}

function needsPeriodGranularity(reportId: ReportId) {
  return reportId === "vendas-periodo";
}

/** Relatórios que comparam profissionais — só para visão da clínica (admin). */
const CLINIC_ONLY_REPORTS = new Set<ReportId>(["cruzado", "vendas-profissional"]);

function reportGroupsForScope(scope: FinancialTabScopeProps["scope"]) {
  if (scope === "clinic") return REPORT_GROUPS;
  return REPORT_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((r) => !CLINIC_ONLY_REPORTS.has(r.id)),
  })).filter((group) => group.items.length > 0);
}

export function ProfessionalFinancialReports({
  scope,
  professionalFilter,
  onProfessionalFilterChange,
}: FinancialTabScopeProps) {
  const { profile } = useAuth();
  const reportGroups = useMemo(() => reportGroupsForScope(scope), [scope]);
  const [active, setActive] = useState<ReportId>("metrics");

  useEffect(() => {
    if (CLINIC_ONLY_REPORTS.has(active) && scope === "professional") {
      setActive("metrics");
    }
  }, [active, scope]);
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodGranularity, setPeriodGranularity] =
    useState<FinancialReportFilters["periodGranularity"]>("month");
  const [applied, setApplied] = useState<ReportQueryCtx | null>(null);
  const [appliedReportId, setAppliedReportId] = useState<ReportId | null>(null);

  const draftFilters = useMemo(
    (): FinancialReportFilters => ({
      from,
      to,
      professionalFilter,
      statusFilter,
      periodGranularity,
    }),
    [from, to, professionalFilter, statusFilter, periodGranularity],
  );

  useEffect(() => {
    if (!profile || from > to) return;
    setApplied((prev) => {
      if (!prev || appliedReportId !== active) return prev;
      return {
        scope,
        profileId: profile.id,
        filters: draftFilters,
      };
    });
  }, [active, from, to, professionalFilter, statusFilter, periodGranularity, scope, profile, draftFilters, appliedReportId]);

  const generateReport = () => {
    if (!profile) return;
    if (from > to) {
      toast.error("A data inicial não pode ser maior que a final");
      return;
    }
    setApplied({
      scope,
      profileId: profile.id,
      filters: draftFilters,
    });
    setAppliedReportId(active);
  };

  const showReport = applied && appliedReportId === active;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Card className="h-fit max-h-[calc(100vh-12rem)] overflow-y-auto">
        <CardContent className="p-2">
          <nav className="space-y-4">
            {reportGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActive(r.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                        active === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <r.icon className="size-4 shrink-0" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros do relatório</CardTitle>
            <CardDescription>
              Ajuste os filtros e clique em gerar. O relatório só carrega após confirmar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            {scope === "clinic" && (
              <FinancialProfessionalFilter
                value={professionalFilter}
                onChange={onProfessionalFilterChange}
              />
            )}
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
            {needsPeriodGranularity(active) && (
              <div>
                <Label className="text-xs">Agrupar por</Label>
                <Select
                  value={periodGranularity}
                  onValueChange={(v) =>
                    setPeriodGranularity(v as FinancialReportFilters["periodGranularity"])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {needsStatusFilter(active) && (
              <div>
                <Label className="text-xs">Situação</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={generateReport}>
              <Play className="mr-2 size-4" />
              Gerar relatório
            </Button>
          </CardContent>
        </Card>

        {showReport && applied ? (
          <FinancialReportPanels reportId={active} queryCtx={applied} />
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <BarChart3 className="mx-auto mb-3 size-10 opacity-40" />
              <p className="font-medium text-foreground">Nenhum relatório gerado</p>
              <p className="mt-1 text-sm">
                Configure os filtros acima e clique em <strong>Gerar relatório</strong>.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
