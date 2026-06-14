import { s as supabase } from "./client-CUE-_UGz.js";
async function loadExpenseCategories(activeOnly = true) {
  let q = supabase.from("expense_categories").select("id, name, active, sort_order").order("sort_order", { ascending: true });
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function saveExpenseCategory(id, patch) {
  const { error } = await supabase.from("expense_categories").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
async function createExpenseCategory(tenantId, name, sortOrder = 99) {
  const { data, error } = await supabase.from("expense_categories").insert({ tenant_id: tenantId, name, sort_order: sortOrder, active: true }).select("id, name, active, sort_order").single();
  if (error) throw new Error(error.message);
  return data;
}
async function ensureExpenseCategories(tenantId) {
  const existing = await loadExpenseCategories(false);
  if (existing.length > 0) return existing;
  const defaults = [
    "Aluguel",
    "Salários",
    "Materiais",
    "Equipamentos",
    "Divulgação",
    "Serviços",
    "Impostos",
    "Outros"
  ];
  const { data, error } = await supabase.from("expense_categories").insert(
    defaults.map((name, i) => ({
      tenant_id: tenantId,
      name,
      sort_order: i + 1,
      active: true
    }))
  ).select("id, name, active, sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export {
  createExpenseCategory as c,
  ensureExpenseCategories as e,
  loadExpenseCategories as l,
  saveExpenseCategory as s
};
