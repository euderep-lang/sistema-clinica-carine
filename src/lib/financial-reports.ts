import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildProfessionalProduction,
  commissionValue,
  type ProfessionalProduction,
} from "@/lib/commission";
import {
  applyCommissionClosingsToProduction,
  loadCommissionClosingsForRange,
  resolveCommissionFromClosings,
} from "@/lib/commission-closings-report";
import {
  computeCompetencePeriodStats,
  computeTotalOpenBalance,
  filterProductionBills,
  type CompetenceBill,
} from "@/lib/financial-competence";
import { roundChartMoney } from "@/lib/chart-format";
import { loadProfessionalExpenses, loadTenantExpenses } from "@/lib/expenses";
import {
  applyPaymentProfessionalFilter,
  applyReceivableProfessionalFilter,
  type FinancialScope,
} from "@/lib/financial-scope";
import { paymentLabel } from "@/lib/payment-methods";
import type { SaleBillRow } from "@/lib/sales";

const BILL_SELECT =
  "id, amount, discount_value, paid_amount, status, due_date, paid_date, competence_date, installment_number, installment_count, consultation_charge_id, professional_id";

export type ReportPeriodGranularity = "day" | "week" | "month";

export interface FinancialReportFilters {
  from: string;
  to: string;
  professionalFilter: string;
  statusFilter: string;
  periodGranularity: ReportPeriodGranularity;
}

export interface ReportQueryCtx {
  scope: FinancialScope;
  profileId: string;
  filters: FinancialReportFilters;
}

export interface FinancialMetrics {
  production: number;
  received: number;
  pending: number;
  totalOpen: number;
  netReceived: number;
  fees: number;
  discounts: number;
  expenses: number;
  result: number;
  billsInPeriod: number;
  paymentsCount: number;
  avgTicket: number;
}

export interface PaymentMethodRow {
  method: string;
  label: string;
  gross: number;
  net: number;
  fees: number;
  count: number;
}

export interface PeriodSalesRow {
  key: string;
  label: string;
  production: number;
  received: number;
  count: number;
}

export interface TopProcedureRow {
  name: string;
  quantity: number;
  revenue: number;
}

export interface CrossReportRow {
  professionalId: string;
  professionalName: string;
  production: number;
  received: number;
  pending: number;
  expenses: number;
  netReceived: number;
  commissionPct: number;
  commissionAmount: number;
  result: number;
}

function period(filters: FinancialReportFilters) {
  return { from: filters.from, to: filters.to };
}

async function loadBills(supabase: SupabaseClient, ctx: ReportQueryCtx) {
  const { data, error } = await applyReceivableProfessionalFilter(
    supabase.from("bills_receivable").select(BILL_SELECT),
    {
      scope: ctx.scope,
      profileId: ctx.profileId,
      professionalFilter: ctx.filters.professionalFilter,
    },
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as SaleBillRow[];
}

async function loadPayments(supabase: SupabaseClient, ctx: ReportQueryCtx) {
  const { data, error } = await applyPaymentProfessionalFilter(
    supabase
      .from("bill_payments" as never)
      .select("amount, fee_amount, net_amount, paid_date, payment_method, status")
      .eq("status", "active")
      .gte("paid_date", ctx.filters.from)
      .lte("paid_date", ctx.filters.to),
    {
      scope: ctx.scope,
      profileId: ctx.profileId,
      professionalFilter: ctx.filters.professionalFilter,
    },
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as {
    amount: number;
    fee_amount: number | null;
    net_amount: number | null;
    payment_method: string;
  }[];
}

async function loadExpenses(supabase: SupabaseClient, ctx: ReportQueryCtx) {
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

function bucketKey(date: string, granularity: ReportPeriodGranularity): string {
  if (granularity === "month") return date.slice(0, 7);
  if (granularity === "week") {
    const d = new Date(`${date}T12:00:00`);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }
  return date;
}

function bucketLabel(key: string, granularity: ReportPeriodGranularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${m}/${y}`;
  }
  if (granularity === "week") return `Sem. ${key.slice(8, 10)}/${key.slice(5, 7)}`;
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export async function loadFinancialMetrics(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<FinancialMetrics> {
  const [bills, payments, expenses] = await Promise.all([
    loadBills(supabase, ctx),
    loadPayments(supabase, ctx),
    loadExpenses(supabase, ctx),
  ]);

  const stats = computeCompetencePeriodStats(bills, period(ctx.filters));
  const productionBills = filterProductionBills(bills, period(ctx.filters));
  const fees = payments.reduce((s, p) => s + Number(p.fee_amount ?? 0), 0);
  const netReceived = payments.reduce((s, p) => s + Number(p.net_amount ?? p.amount), 0);
  const discounts = bills
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + Number(b.discount_value ?? 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const avgTicket =
    productionBills.length > 0
      ? roundChartMoney(
          productionBills.reduce((s, b) => s + Number(b.amount) + Number(b.discount_value ?? 0), 0) /
            productionBills.length,
        )
      : 0;

  return {
    production: roundChartMoney(stats.production),
    received: roundChartMoney(stats.received),
    pending: roundChartMoney(stats.pending),
    totalOpen: roundChartMoney(computeTotalOpenBalance(bills)),
    netReceived: roundChartMoney(netReceived || stats.received - fees),
    fees: roundChartMoney(fees),
    discounts: roundChartMoney(discounts),
    expenses: roundChartMoney(expenseTotal),
    result: roundChartMoney((netReceived || stats.received - fees) - expenseTotal),
    billsInPeriod: productionBills.length,
    paymentsCount: payments.length,
    avgTicket,
  };
}

export async function loadCommissionReport(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<ProfessionalProduction[]> {
  const { data: profs, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, specialty, commission_pct")
    .eq("role", "professional")
    .eq("active", true);
  if (profErr) throw new Error(profErr.message);

  let professionals = (profs ?? []) as Parameters<typeof buildProfessionalProduction>[0];
  if (ctx.scope === "professional") {
    professionals = professionals.filter((p) => p.id === ctx.profileId);
  } else if (ctx.filters.professionalFilter !== "all") {
    professionals = professionals.filter((p) => p.id === ctx.filters.professionalFilter);
  }

  const bills = await loadBills(supabase, ctx);
  const { data: appts, error: apptErr } = await supabase
    .from("appointments")
    .select("professional_id, status, date")
    .eq("status", "completed")
    .gte("date", ctx.filters.from)
    .lte("date", ctx.filters.to);
  if (apptErr) throw new Error(apptErr.message);

  const billsByProf = new Map<string, SaleBillRow[]>();
  for (const bill of bills) {
    if (!bill.professional_id) continue;
    const list = billsByProf.get(bill.professional_id) ?? [];
    list.push(bill);
    billsByProf.set(bill.professional_id, list);
  }

  const closings = await loadCommissionClosingsForRange(
    supabase,
    ctx.filters.from,
    ctx.filters.to,
  );

  const rows = buildProfessionalProduction(
    professionals,
    bills as Parameters<typeof buildProfessionalProduction>[1],
    (appts ?? []) as Parameters<typeof buildProfessionalProduction>[2],
    period(ctx.filters),
  );

  return applyCommissionClosingsToProduction(
    rows,
    closings,
    period(ctx.filters),
    billsByProf as Map<string, CompetenceBill[]>,
  );
}

export async function loadSalesByProfessional(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<ProfessionalProduction[]> {
  return loadCommissionReport(supabase, ctx);
}

export async function loadSalesByPeriod(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<PeriodSalesRow[]> {
  const bills = await loadBills(supabase, ctx);
  const productionBills = filterProductionBills(bills, period(ctx.filters));
  const map = new Map<string, { production: number; received: number; count: number }>();

  for (const bill of productionBills) {
    const date = bill.competence_date ?? bill.due_date;
    const key = bucketKey(date, ctx.filters.periodGranularity);
    const row = map.get(key) ?? { production: 0, received: 0, count: 0 };
    row.production += Number(bill.amount) + Number(bill.discount_value ?? 0);
    row.received += Number(bill.paid_amount);
    row.count += 1;
    map.set(key, row);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({
      key,
      label: bucketLabel(key, ctx.filters.periodGranularity),
      production: roundChartMoney(row.production),
      received: roundChartMoney(row.received),
      count: row.count,
    }));
}

export async function loadSalesByPaymentMethod(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<PaymentMethodRow[]> {
  const payments = await loadPayments(supabase, ctx);
  const map = new Map<string, PaymentMethodRow>();

  for (const row of payments) {
    const method = row.payment_method;
    const current = map.get(method) ?? {
      method,
      label: paymentLabel(method),
      gross: 0,
      net: 0,
      fees: 0,
      count: 0,
    };
    current.gross += Number(row.amount);
    current.net += Number(row.net_amount ?? row.amount);
    current.fees += Number(row.fee_amount ?? 0);
    current.count += 1;
    map.set(method, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      gross: roundChartMoney(row.gross),
      net: roundChartMoney(row.net),
      fees: roundChartMoney(row.fees),
    }))
    .sort((a, b) => b.net - a.net);
}

export async function loadTopProcedures(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
  limit = 10,
): Promise<TopProcedureRow[]> {
  const bills = await loadBills(supabase, ctx);
  const chargeIds = [
    ...new Set(
      filterProductionBills(bills, period(ctx.filters))
        .map((b) => b.consultation_charge_id)
        .filter(Boolean) as string[],
    ),
  ];

  if (chargeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("consultation_charge_items")
    .select("quantity, total_price, item_type, services(name)")
    .in("charge_id", chargeIds)
    .in("item_type", ["charge", "session_sale"]);
  if (error) throw new Error(error.message);

  const map = new Map<string, TopProcedureRow>();
  for (const row of data ?? []) {
    const name = (row as { services: { name: string } | null }).services?.name ?? "Procedimento";
    const current = map.get(name) ?? { name, quantity: 0, revenue: 0 };
    current.quantity += Number(row.quantity);
    current.revenue += Number(row.total_price);
    map.set(name, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      revenue: roundChartMoney(row.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit);
}

export async function loadCrossReport(
  supabase: SupabaseClient,
  ctx: ReportQueryCtx,
): Promise<CrossReportRow[]> {
  const { data: profs, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, commission_pct")
    .eq("role", "professional")
    .eq("active", true);
  if (profErr) throw new Error(profErr.message);

  let professionals = (profs ?? []) as { id: string; full_name: string; commission_pct: number | null }[];
  if (ctx.scope === "professional") {
    professionals = professionals.filter((p) => p.id === ctx.profileId);
  } else if (ctx.filters.professionalFilter !== "all") {
    professionals = professionals.filter((p) => p.id === ctx.filters.professionalFilter);
  }

  const bills = await loadBills(supabase, ctx);
  const expenses = await loadExpenses(supabase, ctx);

  const netByProf = new Map<string, number>();
  const { data: payData, error: payErr } = await applyPaymentProfessionalFilter(
    supabase
      .from("bill_payments" as never)
      .select("professional_id, amount, fee_amount, net_amount")
      .eq("status", "active")
      .gte("paid_date", ctx.filters.from)
      .lte("paid_date", ctx.filters.to),
    {
      scope: ctx.scope,
      profileId: ctx.profileId,
      professionalFilter: ctx.filters.professionalFilter,
    },
  );
  if (payErr) throw new Error(payErr.message);

  for (const row of (payData ?? []) as { professional_id: string | null; net_amount: number | null; amount: number }[]) {
    if (!row.professional_id) continue;
    netByProf.set(
      row.professional_id,
      (netByProf.get(row.professional_id) ?? 0) + Number(row.net_amount ?? row.amount),
    );
  }

  const expenseByProf = new Map<string, number>();
  for (const exp of expenses) {
    const profId = (exp as { professional_id?: string | null }).professional_id;
    if (!profId) continue;
    expenseByProf.set(profId, (expenseByProf.get(profId) ?? 0) + Number(exp.amount));
  }

  const billsByProf = new Map<string, SaleBillRow[]>();
  for (const bill of bills) {
    if (!bill.professional_id) continue;
    const list = billsByProf.get(bill.professional_id) ?? [];
    list.push(bill);
    billsByProf.set(bill.professional_id, list);
  }

  const closings = await loadCommissionClosingsForRange(
    supabase,
    ctx.filters.from,
    ctx.filters.to,
  );

  return professionals
    .map((prof) => {
      const profBills = billsByProf.get(prof.id) ?? [];
      const stats = computeCompetencePeriodStats(profBills, period(ctx.filters));
      const netReceived = roundChartMoney(netByProf.get(prof.id) ?? 0);
      const expensesTotal = roundChartMoney(expenseByProf.get(prof.id) ?? 0);
      const basePct = Number(prof.commission_pct ?? 0);
      const { commissionPct, commissionAmount } = resolveCommissionFromClosings(
        prof.id,
        stats.received,
        basePct,
        closings,
        period(ctx.filters),
        profBills as CompetenceBill[],
      );
      return {
        professionalId: prof.id,
        professionalName: prof.full_name,
        production: roundChartMoney(stats.production),
        received: roundChartMoney(stats.received),
        pending: roundChartMoney(stats.pending),
        expenses: expensesTotal,
        netReceived,
        commissionPct,
        commissionAmount: roundChartMoney(commissionAmount),
        result: roundChartMoney(netReceived - expensesTotal - commissionAmount),
      };
    })
    .filter(
      (row) =>
        row.production > 0 ||
        row.received > 0 ||
        row.pending > 0 ||
        row.expenses > 0 ||
        row.netReceived > 0,
    )
    .sort((a, b) => b.production - a.production);
}

export { commissionValue };
