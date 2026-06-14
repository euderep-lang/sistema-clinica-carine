import { jsxs, jsx } from "react/jsx-runtime";
import { L as Label, I as Input } from "./router-wbAJq94_.js";
import { s as supabase } from "./client-CUE-_UGz.js";
function firstDayOfMonth() {
  const d = /* @__PURE__ */ new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "De",
  toLabel = "Até"
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: fromLabel }),
      /* @__PURE__ */ jsx(Input, { type: "date", value: from, onChange: (e) => onFromChange(e.target.value), className: "w-40" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: toLabel }),
      /* @__PURE__ */ jsx(Input, { type: "date", value: to, onChange: (e) => onToChange(e.target.value), className: "w-40" })
    ] })
  ] });
}
async function loadProfessionalExpenses(professionalId, filters) {
  let q = supabase.from("bills_payable").select(
    "id, description, category, supplier, amount, due_date, paid_date, payment_method, status, notes, professional_id, created_at"
  ).eq("professional_id", professionalId).order("due_date", { ascending: false }).limit(300);
  if (filters?.status && filters.status !== "all") {
    q = q.eq("status", filters.status);
  }
  if (filters?.category && filters.category !== "all") {
    q = q.eq("category", filters.category);
  }
  const dateField = filters?.dateField ?? "due_date";
  if (filters?.from) q = q.gte(dateField, filters.from);
  if (filters?.to) q = q.lte(dateField, filters.to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function createProfessionalExpense(tenantId, professionalId, input) {
  const { data, error } = await supabase.from("bills_payable").insert({
    tenant_id: tenantId,
    professional_id: professionalId,
    description: input.description,
    category: input.category ?? null,
    supplier: input.supplier ?? null,
    amount: input.amount,
    due_date: input.due_date,
    paid_date: input.paid_date ?? null,
    payment_method: input.payment_method ?? null,
    status: input.status ?? (input.paid_date ? "paid" : "pending"),
    notes: input.notes ?? null
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data;
}
async function updateProfessionalExpense(id, input) {
  const { error } = await supabase.from("bills_payable").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}
async function deleteProfessionalExpense(id) {
  const { error } = await supabase.from("bills_payable").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
async function markExpensePaid(id, paidDate, paymentMethod) {
  const { error } = await supabase.from("bills_payable").update({
    status: "paid",
    paid_date: paidDate,
    payment_method: paymentMethod
  }).eq("id", id);
  if (error) throw new Error(error.message);
}
async function cancelExpense(id) {
  const { error } = await supabase.from("bills_payable").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
}
export {
  DateRangeFilter as D,
  cancelExpense as a,
  createProfessionalExpense as c,
  deleteProfessionalExpense as d,
  firstDayOfMonth as f,
  loadProfessionalExpenses as l,
  markExpensePaid as m,
  todayISO as t,
  updateProfessionalExpense as u
};
