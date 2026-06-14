function periodFromYearMonth(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  const lastDay = new Date(y, m, 0).getDate();
  return {
    year: y,
    month: m,
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  };
}
function currentYearMonth() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function commissionValue(received, pct) {
  return received * (pct / 100);
}
function effectiveCommissionPct(base, adjusted) {
  return adjusted != null ? adjusted : base;
}
function buildProfessionalProduction(professionals, bills, appointments, period) {
  const map = /* @__PURE__ */ new Map();
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
      commissionAmount: 0
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
    if (bill.paid_date && bill.paid_date >= period.from && bill.paid_date <= period.to && (bill.status === "paid" || bill.status === "partial")) {
      row.received += Number(bill.paid_amount);
    }
  }
  for (const appt of appointments) {
    if (!appt.professional_id || appt.status !== "completed") continue;
    if (appt.date < period.from || appt.date > period.to) continue;
    const row = map.get(appt.professional_id);
    if (row) row.appointments++;
  }
  return Array.from(map.values()).map((row) => ({
    ...row,
    commissionAmount: commissionValue(row.received, row.commissionPct)
  })).sort((a, b) => b.production - a.production);
}
export {
  commissionValue as a,
  buildProfessionalProduction as b,
  currentYearMonth as c,
  effectiveCommissionPct as e,
  periodFromYearMonth as p,
  todayISO as t
};
