import { supabase } from "@/integrations/supabase/client";

export interface ExpenseCategory {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export async function loadExpenseCategories(activeOnly = true): Promise<ExpenseCategory[]> {
  let q = supabase
    .from("expense_categories" as never)
    .select("id, name, active, sort_order")
    .order("sort_order", { ascending: true });
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseCategory[];
}

export async function saveExpenseCategory(
  id: string,
  patch: Partial<Pick<ExpenseCategory, "name" | "active" | "sort_order">>,
) {
  const { error } = await supabase
    .from("expense_categories" as never)
    .update(patch as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createExpenseCategory(tenantId: string, name: string, sortOrder = 99) {
  const { data, error } = await supabase
    .from("expense_categories" as never)
    .insert({ tenant_id: tenantId, name, sort_order: sortOrder, active: true } as never)
    .select("id, name, active, sort_order")
    .single();
  if (error) throw new Error(error.message);
  return data as ExpenseCategory;
}

export async function ensureExpenseCategories(tenantId: string) {
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
    "Outros",
  ];
  const { data, error } = await supabase
    .from("expense_categories" as never)
    .insert(
      defaults.map((name, i) => ({
        tenant_id: tenantId,
        name,
        sort_order: i + 1,
        active: true,
      })) as never,
    )
    .select("id, name, active, sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseCategory[];
}
