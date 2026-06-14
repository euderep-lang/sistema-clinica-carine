export interface ProfessionalProduction {
  id: string;
  name: string;
  specialty: string | null;
  commissionPct: number;
  appointments: number;
  production: number;
  received: number;
  pending: number;
  commissionAmount: number;
}

export interface PeriodBounds {
  from: string;
  to: string;
  year: number;
  month: number;
}

export function periodFromYearMonth(yearMonth: string): PeriodBounds | null {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  const lastDay = new Date(y, m, 0).getDate();
  return {
    year: y,
    month: m,
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function commissionValue(received: number, pct: number): number {
  return received * (pct / 100);
}

export function effectiveCommissionPct(base: number, adjusted: number | null | undefined): number {
  return adjusted != null ? adjusted : base;
}

type BillRow = {
  professional_id: string | null;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
};

type ApptRow = { professional_id: string | null; status: string; date: string };

type ProfRow = {
  id: string;
  full_name: string;
  specialty: string | null;
  commission_pct: number | null;
};

export function buildProfessionalProduction(
  professionals: ProfRow[],
  bills: BillRow[],
  appointments: ApptRow[],
  period: PeriodBounds,
): ProfessionalProduction[] {
  const map = new Map<string, ProfessionalProduction>();

  for (const p of professionals) {
    map.set(p.id, {
      id: p.id,
      name: p.full_name,
      specialty: p.specialty,
      commissionPct: Number(p.commission_pct ?? 0),
      appointments: 0,
      production: 0,
      received: 0,
      pending: 0,
      commissionAmount: 0,
    });
  }

  for (const bill of bills) {
    if (!bill.professional_id) continue;
    const row = map.get(bill.professional_id);
    if (!row) continue;

    if (bill.due_date >= period.from && bill.due_date <= period.to) {
      row.production += Number(bill.amount);
      if (bill.status === "pending" || bill.status === "partial" || bill.status === "overdue") {
        row.pending += Number(bill.amount) - Number(bill.paid_amount);
      }
    }

    if (
      bill.paid_date &&
      bill.paid_date >= period.from &&
      bill.paid_date <= period.to &&
      (bill.status === "paid" || bill.status === "partial")
    ) {
      row.received += Number(bill.paid_amount);
    }
  }

  for (const appt of appointments) {
    if (!appt.professional_id || appt.status !== "completed") continue;
    if (appt.date < period.from || appt.date > period.to) continue;
    const row = map.get(appt.professional_id);
    if (row) row.appointments++;
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      commissionAmount: commissionValue(row.received, row.commissionPct),
    }))
    .sort((a, b) => b.production - a.production);
}
