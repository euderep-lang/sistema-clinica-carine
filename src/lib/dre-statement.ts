import type { SupabaseClient } from "@supabase/supabase-js";
import { filterProductionBills } from "@/lib/financial-competence";
import { roundChartMoney } from "@/lib/chart-format";
import {
  loadCommissionReport,
  loadFinancialMetrics,
  loadSalesByPaymentMethod,
  type FinancialMetrics,
  type PaymentMethodRow,
  type ReportQueryCtx,
} from "@/lib/financial-reports";
import { loadProfessionalExpenses, loadTenantExpenses } from "@/lib/expenses";

export type DreLineKind = "section" | "group" | "item" | "subtotal" | "total";

export interface DreDisplayLine {
  id: string;
  code: string;
  label: string;
  amount: number | null;
  kind: DreLineKind;
  indent: number;
  deduct?: boolean;
  highlight?: boolean;
}

export interface DreCategoryRow {
  category: string;
  amount: number;
}

export interface DreCommissionRow {
  professionalId: string;
  name: string;
  commissionPct: number;
  received: number;
  amount: number;
}

export interface DreRevenueByProfessional {
  professionalId: string;
  name: string;
  production: number;
  received: number;
  pending: number;
}

export interface DreStatementData {
  metrics: FinancialMetrics;
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  operationalExpenses: number;
  commissions: number;
  financialExpenses: number;
  operatingResult: number;
  revenueByProfessional: DreRevenueByProfessional[];
  expenseByCategory: DreCategoryRow[];
  commissionByProfessional: DreCommissionRow[];
  feesByMethod: PaymentMethodRow[];
}

async function loadExpensesForCtx(supabase: SupabaseClient, ctx: ReportQueryCtx) {
  void supabase;
  return ctx.scope === "clinic"
    ? loadTenantExpenses({
        from: ctx.filters.from,
        to: ctx.filters.to,
        dateField: "paid_date",
        status: "paid",
        professionalFilter: ctx.filters.professionalFilter,
      })
    : loadProfessionalExpenses(ctx.profileId, {
        from: ctx.filters.from,
        to: ctx.filters.to,
        dateField: "paid_date",
        status: "paid",
      });
}

async function loadBillsForDre(supabase: SupabaseClient, ctx: ReportQueryCtx) {
  const { applyReceivableProfessionalFilter } = await import("@/lib/financial-scope");
  const { data, error } = await applyReceivableProfessionalFilter(
    supabase
      .from("bills_receivable")
      .select(
        "id, amount, discount_value, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id, professional_id",
      ),
    {
      scope: ctx.scope,
      profileId: ctx.profileId,
      professionalFilter: ctx.filters.professionalFilter,
    },
  );
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function loadDreStatement(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<DreStatementData> {
  const period = { from: ctx.filters.from, to: ctx.filters.to };

  const [metrics, expenses, commissionRows, feesByMethod, bills] = await Promise.all([
    loadFinancialMetrics(supabase, ctx),
    loadExpensesForCtx(supabase, ctx),
    loadCommissionReport(supabase, ctx),
    loadSalesByPaymentMethod(supabase, ctx),
    loadBillsForDre(supabase, ctx),
  ]);

  const productionBills = filterProductionBills(
    bills as Parameters<typeof filterProductionBills>[0],
    period,
  );
  const discounts = roundChartMoney(
    productionBills.reduce((sum, bill) => sum + Number(bill.discount_value ?? 0), 0),
  );

  const expenseByCategoryMap = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.status === "cancelled") continue;
    const key = expense.category?.trim() || "Sem categoria";
    expenseByCategoryMap.set(key, (expenseByCategoryMap.get(key) ?? 0) + Number(expense.amount));
  }
  const expenseByCategory = Array.from(expenseByCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount: roundChartMoney(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const commissionByProfessional = commissionRows
    .filter((row) => row.commissionAmount > 0 || row.received > 0)
    .map((row) => ({
      professionalId: row.id,
      name: row.name,
      commissionPct: row.commissionPct,
      received: row.received,
      amount: row.commissionAmount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const commissions = roundChartMoney(
    commissionByProfessional.reduce((sum, row) => sum + row.amount, 0),
  );

  const revenueByProfessional: DreRevenueByProfessional[] = commissionRows
    .filter((row) => row.production > 0)
    .map((row) => ({
      professionalId: row.id,
      name: row.name,
      production: row.production,
      received: row.received,
      pending: row.pending,
    }))
    .sort((a, b) => b.production - a.production);

  const unassignedProduction = roundChartMoney(
    productionBills
      .filter((bill) => !bill.professional_id)
      .reduce((sum, bill) => sum + Number(bill.amount), 0),
  );
  if (unassignedProduction > 0) {
    revenueByProfessional.push({
      professionalId: "__none__",
      name: "Sem profissional vinculado",
      production: unassignedProduction,
      received: 0,
      pending: 0,
    });
  }

  const grossRevenue = metrics.production;
  const netRevenue = roundChartMoney(grossRevenue - discounts);
  const operationalExpenses = metrics.expenses;
  const financialExpenses = metrics.fees;
  const operatingResult = roundChartMoney(
    netRevenue - operationalExpenses - commissions - financialExpenses,
  );

  return {
    metrics,
    grossRevenue,
    discounts,
    netRevenue,
    operationalExpenses,
    commissions,
    financialExpenses,
    operatingResult,
    revenueByProfessional,
    expenseByCategory,
    commissionByProfessional,
    feesByMethod,
  };
}

export function buildDreSummaryLines(data: DreStatementData): DreDisplayLine[] {
  return [
    {
      id: "sec-revenue",
      code: "1",
      label: "Receita operacional bruta",
      amount: null,
      kind: "section",
      indent: 0,
    },
    {
      id: "gross",
      code: "1.01",
      label: "Receita de serviços (produção por competência)",
      amount: data.grossRevenue,
      kind: "item",
      indent: 1,
    },
    {
      id: "sec-deductions",
      code: "2",
      label: "(-) Deduções da receita bruta",
      amount: null,
      kind: "section",
      indent: 0,
    },
    {
      id: "discounts",
      code: "2.01",
      label: "Descontos incondicionais concedidos",
      amount: data.discounts,
      kind: "item",
      indent: 1,
      deduct: true,
    },
    {
      id: "net-revenue",
      code: "3",
      label: "(=) Receita operacional líquida",
      amount: data.netRevenue,
      kind: "subtotal",
      indent: 0,
      highlight: true,
    },
    {
      id: "sec-opex",
      code: "4",
      label: "(-) Despesas operacionais",
      amount: null,
      kind: "section",
      indent: 0,
    },
    {
      id: "expenses",
      code: "4.01",
      label: "Despesas pagas no período",
      amount: data.operationalExpenses,
      kind: "item",
      indent: 1,
      deduct: true,
    },
    {
      id: "commissions",
      code: "4.02",
      label: "Comissões de profissionais (sobre recebido)",
      amount: data.commissions,
      kind: "item",
      indent: 1,
      deduct: true,
    },
    {
      id: "sec-fin",
      code: "5",
      label: "(-) Despesas financeiras",
      amount: null,
      kind: "section",
      indent: 0,
    },
    {
      id: "fees",
      code: "5.01",
      label: "Taxas de meios de pagamento",
      amount: data.financialExpenses,
      kind: "item",
      indent: 1,
      deduct: true,
    },
    {
      id: "result",
      code: "6",
      label: "(=) Resultado operacional do período",
      amount: data.operatingResult,
      kind: "total",
      indent: 0,
      highlight: true,
    },
  ];
}

export function buildDreDetailedLines(data: DreStatementData): DreDisplayLine[] {
  const detailed: DreDisplayLine[] = [
    {
      id: "sec-revenue",
      code: "1",
      label: "Receita operacional bruta",
      amount: null,
      kind: "section",
      indent: 0,
    },
  ];

  if (data.revenueByProfessional.length === 0) {
    detailed.push({
      id: "gross",
      code: "1.01",
      label: "Receita de serviços (produção por competência)",
      amount: data.grossRevenue,
      kind: "item",
      indent: 1,
    });
  } else {
    detailed.push({
      id: "sec-revenue-pros",
      code: "1.0",
      label: "Receita por profissional (produção por competência)",
      amount: null,
      kind: "group",
      indent: 1,
    });
    data.revenueByProfessional.forEach((row, index) => {
      detailed.push({
        id: `rev-${row.professionalId}`,
        code: `1.${String(index + 1).padStart(2, "0")}`,
        label: row.name,
        amount: row.production,
        kind: "item",
        indent: 2,
      });
    });
    detailed.push({
      id: "gross-subtotal",
      code: "1.99",
      label: "Subtotal receita operacional bruta",
      amount: data.grossRevenue,
      kind: "subtotal",
      indent: 1,
      highlight: true,
    });
  }

  detailed.push(
    {
      id: "sec-deductions",
      code: "2",
      label: "(-) Deduções da receita bruta",
      amount: null,
      kind: "section",
      indent: 0,
    },
    {
      id: "discounts",
      code: "2.01",
      label: "Descontos incondicionais concedidos",
      amount: data.discounts,
      kind: "item",
      indent: 1,
      deduct: true,
    },
    {
      id: "net-revenue",
      code: "3",
      label: "(=) Receita operacional líquida",
      amount: data.netRevenue,
      kind: "subtotal",
      indent: 0,
      highlight: true,
    },
    {
      id: "sec-opex",
      code: "4",
      label: "(-) Despesas operacionais",
      amount: null,
      kind: "section",
      indent: 0,
    },
  );

  if (data.expenseByCategory.length === 0) {
    detailed.push({
      id: "expenses-empty",
      code: "4.01",
      label: "Despesas pagas no período",
      amount: 0,
      kind: "item",
      indent: 1,
      deduct: true,
    });
  } else {
    data.expenseByCategory.forEach((row, index) => {
      detailed.push({
        id: `expense-${index}`,
        code: `4.${String(index + 1).padStart(2, "0")}`,
        label: row.category,
        amount: row.amount,
        kind: "item",
        indent: 2,
        deduct: true,
      });
    });
    detailed.push({
      id: "expenses-subtotal",
      code: "4.99",
      label: "Subtotal despesas operacionais",
      amount: data.operationalExpenses,
      kind: "subtotal",
      indent: 1,
      deduct: true,
    });
  }

  detailed.push({
    id: "sec-comm",
    code: "4C",
    label: "Comissões de profissionais",
    amount: null,
    kind: "group",
    indent: 1,
  });

  if (data.commissionByProfessional.length === 0) {
    detailed.push({
      id: "comm-empty",
      code: "4C.01",
      label: "Sem comissões no período",
      amount: 0,
      kind: "item",
      indent: 2,
      deduct: true,
    });
  } else {
    data.commissionByProfessional.forEach((row, index) => {
      detailed.push({
        id: `comm-${row.professionalId}`,
        code: `4C.${String(index + 1).padStart(2, "0")}`,
        label: `${row.name} — ${row.commissionPct}%`,
        amount: row.amount,
        kind: "item",
        indent: 2,
        deduct: true,
      });
    });
  }

  detailed.push({
    id: "comm-subtotal",
    code: "4C.99",
    label: "Subtotal comissões",
    amount: data.commissions,
    kind: "subtotal",
    indent: 1,
    deduct: true,
  });

  detailed.push({
    id: "sec-fin",
    code: "5",
    label: "(-) Despesas financeiras",
    amount: null,
    kind: "section",
    indent: 0,
  });

  if (data.feesByMethod.length === 0) {
    detailed.push({
      id: "fees-empty",
      code: "5.01",
      label: "Taxas de meios de pagamento",
      amount: 0,
      kind: "item",
      indent: 1,
      deduct: true,
    });
  } else {
    data.feesByMethod.forEach((row, index) => {
      detailed.push({
        id: `fee-${row.method}`,
        code: `5.${String(index + 1).padStart(2, "0")}`,
        label: `${row.label} (${row.count} recebimento${row.count === 1 ? "" : "s"})`,
        amount: row.fees,
        kind: "item",
        indent: 2,
        deduct: true,
      });
    });
    detailed.push({
      id: "fees-subtotal",
      code: "5.99",
      label: "Subtotal despesas financeiras",
      amount: data.financialExpenses,
      kind: "subtotal",
      indent: 1,
      deduct: true,
    });
  }

  detailed.push({
    id: "result",
    code: "6",
    label: "(=) Resultado operacional do período",
    amount: data.operatingResult,
    kind: "total",
    indent: 0,
    highlight: true,
  });

  // Anexo — caixa
  detailed.push({
    id: "annex",
    code: "A",
    label: "Anexo — Demonstrativo de caixa (informação complementar)",
    amount: null,
    kind: "section",
    indent: 0,
  });
  detailed.push({
    id: "cash-gross",
    code: "A.01",
    label: "Recebimentos brutos no período",
    amount: data.metrics.received,
    kind: "item",
    indent: 1,
  });
  detailed.push({
    id: "cash-fees",
    code: "A.02",
    label: "(-) Taxas deduzidas no caixa",
    amount: data.metrics.fees,
    kind: "item",
    indent: 1,
    deduct: true,
  });
  detailed.push({
    id: "cash-net",
    code: "A.03",
    label: "(=) Recebimentos líquidos",
    amount: data.metrics.netReceived,
    kind: "subtotal",
    indent: 1,
    highlight: true,
  });
  detailed.push({
    id: "pending",
    code: "A.04",
    label: "Contas a receber em aberto (referência)",
    amount: data.metrics.totalOpen,
    kind: "item",
    indent: 1,
  });
  detailed.push({
    id: "pending-period",
    code: "A.05",
    label: "Produção pendente no período (competência)",
    amount: data.metrics.pending,
    kind: "item",
    indent: 1,
  });

  return detailed;
}
