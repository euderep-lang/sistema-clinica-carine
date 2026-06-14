export interface CompetenceBill {
  id: string;
  amount: number;
  paid_amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  competence_date: string | null;
  installment_number: number | null;
  installment_count: number | null;
  consultation_charge_id: string | null;
  professional_id?: string | null;
}

export interface CompetencePeriodStats {
  production: number;
  received: number;
  receivedNet: number;
  pending: number;
}

function billCompetenceDate(bill: CompetenceBill): string {
  return bill.competence_date ?? bill.due_date;
}

function isInstallmentSale(bill: CompetenceBill): boolean {
  return (bill.installment_count ?? 0) > 1 && Boolean(bill.consultation_charge_id);
}

function groupKey(bill: CompetenceBill): string {
  if (isInstallmentSale(bill)) {
    return `charge:${bill.consultation_charge_id}`;
  }
  return `bill:${bill.id}`;
}

function inPeriod(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function buildCompetenceGroups(bills: CompetenceBill[]): Map<string, CompetenceBill[]> {
  const groups = new Map<string, CompetenceBill[]>();
  for (const bill of bills) {
    if (bill.status === "cancelled") continue;
    const key = groupKey(bill);
    const list = groups.get(key) ?? [];
    list.push(bill);
    groups.set(key, list);
  }
  return groups;
}

export function computeCompetencePeriodStats(
  bills: CompetenceBill[],
  period: { from: string; to: string },
  options?: { useNetReceived?: boolean; netByBillId?: Map<string, number> },
): CompetencePeriodStats {
  const groups = buildCompetenceGroups(bills);
  let production = 0;
  let received = 0;
  let receivedNet = 0;
  let pending = 0;

  for (const groupBills of groups.values()) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    const installmentGroup = isInstallmentSale(groupBills[0]);
    const competenceInPeriod = inPeriod(competenceDate, period.from, period.to);

    const totalAmount = groupBills.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalPaid = groupBills.reduce((sum, b) => sum + Number(b.paid_amount), 0);
    const totalPending = groupBills.reduce(
      (sum, b) => sum + Math.max(0, Number(b.amount) - Number(b.paid_amount)),
      0,
    );

    if (installmentGroup) {
      if (competenceInPeriod) {
        production += totalAmount;
        pending += totalPending;
        if (totalPaid > 0) {
          received += totalPaid;
          if (options?.useNetReceived && options.netByBillId) {
            receivedNet += groupBills.reduce(
              (sum, b) => sum + (options.netByBillId?.get(b.id) ?? Number(b.paid_amount)),
              0,
            );
          } else {
            receivedNet += totalPaid;
          }
        }
      }
      continue;
    }

    const bill = groupBills[0];
    if (competenceInPeriod) {
      production += Number(bill.amount);
      if (["pending", "partial", "overdue"].includes(bill.status)) {
        pending += Number(bill.amount) - Number(b.paid_amount);
      }
    }

    const receivedDate = bill.paid_date ?? competenceDate;
    if (
      totalPaid > 0 &&
      inPeriod(receivedDate, period.from, period.to) &&
      (bill.status === "paid" || bill.status === "partial")
    ) {
      received += totalPaid;
      receivedNet += options?.netByBillId?.get(bill.id) ?? totalPaid;
    }
  }

  return { production, received, receivedNet, pending };
}

export function filterBillsForCompetencePeriod(
  bills: CompetenceBill[],
  period: { from: string; to: string },
): CompetenceBill[] {
  const groups = buildCompetenceGroups(bills);
  const included = new Set<string>();

  for (const [key, groupBills] of groups) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    if (inPeriod(competenceDate, period.from, period.to)) {
      included.add(key);
      continue;
    }
    if (!isInstallmentSale(groupBills[0])) {
      const bill = groupBills[0];
      const receivedDate = bill.paid_date ?? competenceDate;
      if (
        Number(bill.paid_amount) > 0 &&
        inPeriod(receivedDate, period.from, period.to)
      ) {
        included.add(key);
      }
    }
  }

  return bills.filter((b) => included.has(groupKey(b)));
}
