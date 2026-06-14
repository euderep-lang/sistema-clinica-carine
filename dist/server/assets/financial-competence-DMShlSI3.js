function billCompetenceDate(bill) {
  return bill.competence_date ?? bill.due_date;
}
function isInstallmentSale(bill) {
  return (bill.installment_count ?? 0) > 1 && Boolean(bill.consultation_charge_id);
}
function groupKey(bill) {
  if (isInstallmentSale(bill)) {
    return `charge:${bill.consultation_charge_id}`;
  }
  return `bill:${bill.id}`;
}
function inPeriod(date, from, to) {
  return date >= from && date <= to;
}
function buildCompetenceGroups(bills) {
  const groups = /* @__PURE__ */ new Map();
  for (const bill of bills) {
    if (bill.status === "cancelled") continue;
    const key = groupKey(bill);
    const list = groups.get(key) ?? [];
    list.push(bill);
    groups.set(key, list);
  }
  return groups;
}
function computeCompetencePeriodStats(bills, period, options) {
  const groups = buildCompetenceGroups(bills);
  let production = 0;
  let received = 0;
  let receivedNet = 0;
  let pending = 0;
  for (const groupBills of groups.values()) {
    const competenceDate = billCompetenceDate(groupBills[0]);
    const installmentGroup = isInstallmentSale(groupBills[0]);
    const competenceInPeriod = inPeriod(competenceDate, period.from, period.to);
    const totalAmount = groupBills.reduce((sum, b2) => sum + Number(b2.amount), 0);
    const totalPaid = groupBills.reduce((sum, b2) => sum + Number(b2.paid_amount), 0);
    const totalPending = groupBills.reduce(
      (sum, b2) => sum + Math.max(0, Number(b2.amount) - Number(b2.paid_amount)),
      0
    );
    if (installmentGroup) {
      if (competenceInPeriod) {
        production += totalAmount;
        pending += totalPending;
        if (totalPaid > 0) {
          received += totalPaid;
          {
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
    if (totalPaid > 0 && inPeriod(receivedDate, period.from, period.to) && (bill.status === "paid" || bill.status === "partial")) {
      received += totalPaid;
      receivedNet += totalPaid;
    }
  }
  return { production, received, receivedNet, pending };
}
export {
  computeCompetencePeriodStats as c
};
