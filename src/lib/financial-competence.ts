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

export interface NetRevenueByChannel {
  cash: number;
  card: number;
  pix: number;
  total: number;
}

export interface PeriodPaymentRow {
  payment_method: string;
  net_amount: number | null;
  amount: number;
}

export interface PeriodPaymentDetail extends PeriodPaymentRow {
  bill_receivable_id: string;
  paid_date: string;
}

export function aggregatePeriodPaymentTotals(payments: PeriodPaymentRow[]): {
  gross: number;
  net: number;
  fees: number;
} {
  let gross = 0;
  let net = 0;
  for (const payment of payments) {
    const amount = Number(payment.amount);
    const netAmount = Number(payment.net_amount ?? payment.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    gross += amount;
    net += Number.isFinite(netAmount) && netAmount > 0 ? netAmount : amount;
  }
  return {
    gross: Math.round(gross * 100) / 100,
    net: Math.round(net * 100) / 100,
    fees: Math.round((gross - net) * 100) / 100,
  };
}

export function paymentBillIdsInPeriod(payments: PeriodPaymentDetail[]): Set<string> {
  return new Set(payments.map((p) => p.bill_receivable_id));
}

export function aggregateNetRevenueByChannel(payments: PeriodPaymentRow[]): NetRevenueByChannel {
  let cash = 0;
  let card = 0;
  let pix = 0;

  for (const payment of payments) {
    const net = Number(payment.net_amount ?? payment.amount);
    if (!Number.isFinite(net) || net <= 0) continue;

    const method = payment.payment_method;
    if (method === "cash") cash += net;
    else if (method === "pix") pix += net;
    else if (method === "credit_card" || method === "debit_card") card += net;
  }

  return {
    cash: Math.round(cash * 100) / 100,
    card: Math.round(card * 100) / 100,
    pix: Math.round(pix * 100) / 100,
    total: Math.round((cash + card + pix) * 100) / 100,
  };
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

/** Data exibida no card "Recebimentos" — alinhada ao filtro do período. */
export function billReceivedDisplayDate(bill: CompetenceBill): string | null {
  return bill.paid_date ?? bill.competence_date ?? bill.due_date ?? null;
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

/** Orçamentos (faturas ainda não convertidas em venda) não entram em cálculos financeiros. */
export function isBudgetBill(bill: CompetenceBill): boolean {
  return bill.status === "budget";
}

export function buildCompetenceGroups(bills: CompetenceBill[]): Map<string, CompetenceBill[]> {
  const groups = new Map<string, CompetenceBill[]>();
  for (const bill of bills) {
    if (bill.status === "cancelled" || isBudgetBill(bill)) continue;
    const key = groupKey(bill);
    const list = groups.get(key) ?? [];
    list.push(bill);
    groups.set(key, list);
  }
  return groups;
}

export function computeTotalOpenBalance(bills: CompetenceBill[]): number {
  return bills
    .filter((bill) => bill.status !== "cancelled" && !isBudgetBill(bill))
    .reduce(
      (sum, bill) => sum + Math.max(0, Number(bill.amount) - Number(bill.paid_amount)),
      0,
    );
}

export function computeOpenBudgetsStats(bills: CompetenceBill[]): { count: number; total: number } {
  const openBudgets = bills.filter((bill) => isBudgetBill(bill));
  return {
    count: openBudgets.length,
    total: openBudgets.reduce((sum, bill) => sum + Number(bill.amount), 0),
  };
}

function openBalance(bill: CompetenceBill): number {
  return Math.max(0, Number(bill.amount) - Number(bill.paid_amount));
}

function appendUniqueBills(target: CompetenceBill[], bills: CompetenceBill[]) {
  const seen = new Set(target.map((bill) => bill.id));
  for (const bill of bills) {
    if (seen.has(bill.id)) continue;
    seen.add(bill.id);
    target.push(bill);
  }
}

/** Vendas com competência no período (inclui parcelas do mesmo atendimento). */
export function filterProductionBills(
  bills: CompetenceBill[],
  period: { from: string; to: string },
): CompetenceBill[] {
  const groups = buildCompetenceGroups(bills);
  const result: CompetenceBill[] = [];
  for (const groupBills of groups.values()) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    if (inPeriod(competenceDate, period.from, period.to)) {
      appendUniqueBills(result, groupBills);
    }
  }
  return result;
}

/** Cobranças com pagamento registrado no período (data do pagamento em bill_payments). */
export function filterReceivedBills(
  bills: CompetenceBill[],
  period: { from: string; to: string },
  paymentBillIds?: Set<string>,
): CompetenceBill[] {
  if (paymentBillIds && paymentBillIds.size > 0) {
    return bills.filter((bill) => paymentBillIds.has(bill.id));
  }

  const groups = buildCompetenceGroups(bills);
  const result: CompetenceBill[] = [];

  for (const groupBills of groups.values()) {
    const bill = groupBills[0];
    const competenceDate = billCompetenceDate(bill);
    const totalPaid = groupBills.reduce((sum, b) => sum + Number(b.paid_amount), 0);

    if (isInstallmentSale(bill)) {
      if (inPeriod(competenceDate, period.from, period.to) && totalPaid > 0) {
        appendUniqueBills(
          result,
          groupBills.filter((b) => Number(b.paid_amount) > 0),
        );
      }
      continue;
    }

    const receivedDate = bill.paid_date ?? competenceDate;
    if (
      totalPaid > 0 &&
      inPeriod(receivedDate, period.from, period.to) &&
      (bill.status === "paid" || bill.status === "partial")
    ) {
      appendUniqueBills(result, [bill]);
    }
  }

  return result;
}

/** Saldo em aberto das vendas com competência no período. */
export function filterPendingMonthBills(
  bills: CompetenceBill[],
  period: { from: string; to: string },
): CompetenceBill[] {
  const groups = buildCompetenceGroups(bills);
  const result: CompetenceBill[] = [];

  for (const groupBills of groups.values()) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    if (!inPeriod(competenceDate, period.from, period.to)) continue;
    const withOpen = groupBills.filter((b) => openBalance(b) > 0);
    if (withOpen.length > 0) appendUniqueBills(result, withOpen);
  }

  return result;
}

/** Todas as faturas com saldo em aberto. */
export function filterTotalOpenBills(bills: CompetenceBill[]): CompetenceBill[] {
  return bills.filter(
    (bill) => bill.status !== "cancelled" && !isBudgetBill(bill) && openBalance(bill) > 0,
  );
}

export function filterOpenBudgetBills(bills: CompetenceBill[]): CompetenceBill[] {
  return bills.filter((bill) => isBudgetBill(bill));
}

export type FinancialSummaryKind =
  | "production"
  | "received"
  | "pending"
  | "totalOpen"
  | "openBudgets";

export const FINANCIAL_SUMMARY_META: Record<
  FinancialSummaryKind,
  { title: string; description: string }
> = {
  production: {
    title: "Vendas do período",
    description: "Faturas com competência no período selecionado.",
  },
  received: {
    title: "Recebimentos do período",
    description: "Pagamentos registrados no período selecionado (data do recebimento).",
  },
  pending: {
    title: "A receber do período",
    description: "Saldo em aberto (pendentes + vencidas) das vendas do período selecionado.",
  },
  totalOpen: {
    title: "Total em aberto",
    description: "Todas as faturas com saldo pendente.",
  },
  openBudgets: {
    title: "Orçamentos em aberto",
    description: "Orçamentos ainda não convertidos em venda.",
  },
};

export function financialSummaryDescription(
  kind: FinancialSummaryKind,
  period: { from: string; to: string } | null,
  formatDate: (iso: string) => string,
): string {
  if (kind === "totalOpen" || kind === "openBudgets" || !period) {
    return FINANCIAL_SUMMARY_META[kind].description;
  }
  const range = `${formatDate(period.from)} – ${formatDate(period.to)}`;
  switch (kind) {
    case "production":
      return `Faturas com competência entre ${range}.`;
    case "received":
      return `Pagamentos registrados entre ${range} (data do recebimento).`;
    case "pending":
      return `Saldo em aberto (pendentes + vencidas) das vendas com competência entre ${range}.`;
    default:
      return FINANCIAL_SUMMARY_META[kind].description;
  }
}

export function computeCompetencePeriodStats(
  bills: CompetenceBill[],
  period: { from: string; to: string },
  options?: {
    periodPayments?: PeriodPaymentRow[];
    netByBillId?: Map<string, number>;
  },
): CompetencePeriodStats {
  const groups = buildCompetenceGroups(bills);
  let production = 0;
  let pending = 0;

  for (const groupBills of groups.values()) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    const installmentGroup = isInstallmentSale(groupBills[0]);
    const competenceInPeriod = inPeriod(competenceDate, period.from, period.to);

    const totalAmount = groupBills.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalPending = groupBills.reduce(
      (sum, b) => sum + Math.max(0, Number(b.amount) - Number(b.paid_amount)),
      0,
    );

    if (installmentGroup) {
      if (competenceInPeriod) {
        production += totalAmount;
        pending += totalPending;
      }
      continue;
    }

    const bill = groupBills[0];
    if (competenceInPeriod) {
      production += Number(bill.amount);
      if (["pending", "partial", "overdue"].includes(bill.status)) {
        pending += Number(bill.amount) - Number(bill.paid_amount);
      }
    }
  }

  if (options?.periodPayments) {
    const totals = aggregatePeriodPaymentTotals(options.periodPayments);
    return {
      production,
      received: totals.gross,
      receivedNet: totals.net,
      pending,
    };
  }

  let received = 0;
  let receivedNet = 0;

  for (const groupBills of groups.values()) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    const installmentGroup = isInstallmentSale(groupBills[0]);
    const competenceInPeriod = inPeriod(competenceDate, period.from, period.to);
    const totalPaid = groupBills.reduce((sum, b) => sum + Number(b.paid_amount), 0);

    if (installmentGroup) {
      if (competenceInPeriod && totalPaid > 0) {
        received += totalPaid;
        if (options?.netByBillId) {
          receivedNet += groupBills.reduce(
            (sum, b) => sum + (options.netByBillId?.get(b.id) ?? Number(b.paid_amount)),
            0,
          );
        } else {
          receivedNet += totalPaid;
        }
      }
      continue;
    }

    const bill = groupBills[0];
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
  paymentBillIds?: Set<string>,
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
      if (paymentBillIds?.has(bill.id)) {
        included.add(key);
        continue;
      }
      const receivedDate = bill.paid_date ?? competenceDate;
      if (
        Number(bill.paid_amount) > 0 &&
        inPeriod(receivedDate, period.from, period.to)
      ) {
        included.add(key);
      }
    } else if (paymentBillIds) {
      const hasPaymentInPeriod = groupBills.some((b) => paymentBillIds.has(b.id));
      if (hasPaymentInPeriod) included.add(key);
    }
  }

  const result = bills.filter((b) => included.has(groupKey(b)));

  // Orçamentos (status 'budget') não entram no agrupamento de competência, mas
  // devem aparecer na listagem do período pela sua data de competência/vencimento.
  for (const b of bills) {
    if (!isBudgetBill(b)) continue;
    const competenceDate = billCompetenceDate(b);
    if (inPeriod(competenceDate, period.from, period.to)) result.push(b);
  }

  return result;
}
