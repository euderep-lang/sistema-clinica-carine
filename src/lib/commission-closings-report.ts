import type { SupabaseClient } from "@supabase/supabase-js";
import {
  commissionValue,
  effectiveCommissionPct,
  type ProfessionalProduction,
} from "@/lib/commission";
import { computeCompetencePeriodStats, type CompetenceBill } from "@/lib/financial-competence";
import { roundChartMoney } from "@/lib/chart-format";
import { addMonthsISO } from "@/lib/locale";

export interface CommissionClosingSnapshot {
  professionalId: string;
  periodYear: number;
  periodMonth: number;
  baseCommissionPct: number;
  adjustedCommissionPct: number | null;
  commissionAmount: number;
  receivedTotal: number;
}

export function enumerateMonthsInRange(
  from: string,
  to: string,
): { year: number; month: number; from: string; to: string }[] {
  const start = from.slice(0, 10);
  const end = to.slice(0, 10);
  if (start > end) return [];

  const months: { year: number; month: number; from: string; to: string }[] = [];
  let cursor = `${start.slice(0, 7)}-01`;

  while (cursor.slice(0, 7) <= end.slice(0, 7)) {
    const year = Number(cursor.slice(0, 4));
    const month = Number(cursor.slice(5, 7));
    const monthStart = cursor;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    months.push({
      year,
      month,
      from: monthStart < start ? start : monthStart,
      to: monthEnd > end ? end : monthEnd,
    });
    cursor = addMonthsISO(cursor, 1);
  }

  return months;
}

export async function loadCommissionClosingsForRange(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<Map<string, CommissionClosingSnapshot[]>> {
  const months = enumerateMonthsInRange(from, to);
  if (months.length === 0) return new Map();

  const years = [...new Set(months.map((m) => m.year))];
  const { data, error } = await supabase
    .from("commission_closings")
    .select(
      "professional_id, period_year, period_month, base_commission_pct, adjusted_commission_pct, commission_amount, received_total",
    )
    .in("period_year", years);

  if (error) throw new Error(error.message);

  const monthKeys = new Set(months.map((m) => `${m.year}-${m.month}`));
  const map = new Map<string, CommissionClosingSnapshot[]>();

  for (const row of (data ?? []) as {
    professional_id: string;
    period_year: number;
    period_month: number;
    base_commission_pct: number;
    adjusted_commission_pct: number | null;
    commission_amount: number;
    received_total: number;
  }[]) {
    const key = `${row.period_year}-${row.period_month}`;
    if (!monthKeys.has(key)) continue;
    const list = map.get(row.professional_id) ?? [];
    list.push({
      professionalId: row.professional_id,
      periodYear: row.period_year,
      periodMonth: row.period_month,
      baseCommissionPct: Number(row.base_commission_pct),
      adjustedCommissionPct: row.adjusted_commission_pct,
      commissionAmount: Number(row.commission_amount),
      receivedTotal: Number(row.received_total),
    });
    map.set(row.professional_id, list);
  }

  return map;
}

function closingPct(closing: CommissionClosingSnapshot): number {
  return effectiveCommissionPct(closing.baseCommissionPct, closing.adjustedCommissionPct);
}

export function applyCommissionClosingsToProduction(
  rows: ProfessionalProduction[],
  closingsByProf: Map<string, CommissionClosingSnapshot[]>,
  period: { from: string; to: string },
  billsByProf?: Map<string, CompetenceBill[]>,
): ProfessionalProduction[] {
  const months = enumerateMonthsInRange(period.from, period.to);

  return rows.map((row) => {
    const closings = closingsByProf.get(row.id) ?? [];
    if (closings.length === 0) return row;

    if (months.length === 1) {
      const closing = closings.find(
        (c) => c.periodYear === months[0].year && c.periodMonth === months[0].month,
      );
      if (!closing) return row;
      const pct = closingPct(closing);
      return {
        ...row,
        commissionPct: pct,
        commissionAmount: roundChartMoney(commissionValue(row.received, pct)),
      };
    }

    const profBills = billsByProf?.get(row.id) ?? [];
    let totalCommission = 0;
    let totalReceived = 0;

    for (const month of months) {
      const closing = closings.find(
        (c) => c.periodYear === month.year && c.periodMonth === month.month,
      );
      const pct = closing ? closingPct(closing) : row.commissionPct;
      const receivedInMonth =
        profBills.length > 0
          ? computeCompetencePeriodStats(profBills, { from: month.from, to: month.to }).received
          : 0;

      totalReceived += receivedInMonth;
      totalCommission += commissionValue(receivedInMonth, pct);
    }

    const blendedPct =
      totalReceived > 0 ? (totalCommission / totalReceived) * 100 : row.commissionPct;

    return {
      ...row,
      commissionPct: Math.round(blendedPct * 100) / 100,
      commissionAmount: roundChartMoney(totalCommission),
    };
  });
}

export function resolveCommissionFromClosings(
  professionalId: string,
  received: number,
  basePct: number,
  closingsByProf: Map<string, CommissionClosingSnapshot[]>,
  period: { from: string; to: string },
  profBills?: CompetenceBill[],
): { commissionPct: number; commissionAmount: number } {
  const [row] = applyCommissionClosingsToProduction(
    [
      {
        id: professionalId,
        name: "",
        specialty: null,
        commissionPct: basePct,
        appointments: 0,
        production: 0,
        received,
        pending: 0,
        commissionAmount: commissionValue(received, basePct),
      },
    ],
    closingsByProf,
    period,
    profBills ? new Map([[professionalId, profBills]]) : undefined,
  );
  return {
    commissionPct: row.commissionPct,
    commissionAmount: row.commissionAmount,
  };
}
