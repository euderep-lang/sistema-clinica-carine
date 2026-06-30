import { supabase } from "@/integrations/supabase/client";
import { softDelete } from "@/lib/trash";

export interface ExpenseRow {
  id: string;
  description: string;
  category: string | null;
  supplier: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  professional_id: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface ExpenseInput {
  description: string;
  category?: string | null;
  supplier?: string | null;
  amount: number;
  due_date: string;
  payment_method?: string | null;
  notes?: string | null;
  status?: string;
  paid_date?: string | null;
}

export async function loadTenantExpenses(
  filters?: {
    status?: string;
    category?: string;
    from?: string;
    to?: string;
    dateField?: "due_date" | "paid_date";
    professionalFilter?: string;
  },
): Promise<ExpenseRow[]> {
  let q = supabase
    .from("bills_payable" as never)
    .select(
      "id, description, category, supplier, amount, due_date, paid_date, payment_method, status, notes, professional_id, created_at, profiles:professional_id(full_name)",
    )
    .order("due_date", { ascending: false })
    .limit(500);

  if (filters?.professionalFilter && filters.professionalFilter !== "all") {
    q = q.eq("professional_id", filters.professionalFilter);
  }
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
  return (data ?? []) as ExpenseRow[];
}

export async function loadProfessionalExpenses(
  professionalId: string,
  filters?: {
    status?: string;
    category?: string;
    from?: string;
    to?: string;
    dateField?: "due_date" | "paid_date";
  },
): Promise<ExpenseRow[]> {
  let q = supabase
    .from("bills_payable" as never)
    .select(
      "id, description, category, supplier, amount, due_date, paid_date, payment_method, status, notes, professional_id, created_at",
    )
    .eq("professional_id", professionalId)
    .order("due_date", { ascending: false })
    .limit(300);

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
  return (data ?? []) as ExpenseRow[];
}

export async function createTenantExpense(tenantId: string, input: ExpenseInput) {
  const { data, error } = await supabase
    .from("bills_payable" as never)
    .insert({
      tenant_id: tenantId,
      professional_id: null,
      description: input.description,
      category: input.category ?? null,
      supplier: input.supplier ?? null,
      amount: input.amount,
      due_date: input.due_date,
      paid_date: input.paid_date ?? null,
      payment_method: input.payment_method ?? null,
      status: input.status ?? (input.paid_date ? "paid" : "pending"),
      notes: input.notes ?? null,
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function createProfessionalExpense(
  tenantId: string,
  professionalId: string,
  input: ExpenseInput,
) {
  const { data, error } = await supabase
    .from("bills_payable" as never)
    .insert({
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
      notes: input.notes ?? null,
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}

export async function updateProfessionalExpense(id: string, input: Partial<ExpenseInput>) {
  const { error } = await supabase
    .from("bills_payable" as never)
    .update(input as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProfessionalExpense(id: string) {
  const { data: row } = await supabase
    .from("bills_payable" as never)
    .select("description, amount")
    .eq("id", id)
    .maybeSingle();
  const r = row as { description?: string | null; amount?: number | null } | null;
  await softDelete({
    entityType: "expense",
    table: "bills_payable",
    id,
    label: r?.description?.trim() || "Despesa",
    summary:
      r?.amount != null
        ? `R$ ${Number(r.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : null,
  });
}

export async function markExpensePaid(
  id: string,
  paidDate: string,
  paymentMethod: string,
) {
  const { error } = await supabase
    .from("bills_payable" as never)
    .update({
      status: "paid",
      paid_date: paidDate,
      payment_method: paymentMethod,
    } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function cancelExpense(id: string) {
  const { error } = await supabase
    .from("bills_payable" as never)
    .update({ status: "cancelled" } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
