import { c as computeCompetencePeriodStats } from "./financial-competence-CrKl4Oe7.js";
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
  const billsByProf = /* @__PURE__ */ new Map();
  for (const bill of bills) {
    if (!bill.professional_id) continue;
    const list = billsByProf.get(bill.professional_id) ?? [];
    list.push(bill);
    billsByProf.set(bill.professional_id, list);
  }
  for (const [profId, profBills] of billsByProf) {
    const row = map.get(profId);
    if (!row) continue;
    const stats = computeCompetencePeriodStats(profBills, period);
    row.production = stats.production;
    row.received = stats.received;
    row.pending = stats.pending;
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
  buildProfessionalProduction as b,
  commissionValue as c,
  effectiveCommissionPct as e,
  periodFromYearMonth as p
};
