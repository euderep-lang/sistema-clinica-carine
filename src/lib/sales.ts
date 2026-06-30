import { addMonthsISO } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";
import { archiveEntity, fetchRowForTrash } from "@/lib/trash";

export interface SaleItemInput {
  service_id: string;
  quantity: number;
  unit_price?: number;
}

export interface SaleBillRow {
  id: string;
  description: string;
  amount: number;
  discount_value?: number;
  paid_amount: number;
  due_date: string;
  paid_date: string | null;
  competence_date: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  budget_id: string | null;
  patient_id: string | null;
  professional_id?: string | null;
  installment_number: number | null;
  installment_count: number | null;
  consultation_charge_id: string | null;
  nfse_number?: string | null;
  nfse_status?: string | null;
  nfse_issued_at?: string | null;
  patients: { full_name: string } | null;
  profiles?: { full_name: string } | null;
}

export interface SaleChargeItem {
  id: string;
  service_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: string;
  services: { name: string; session_count: number } | null;
}

export interface InstallmentPreview {
  number: number;
  amount: number;
  dueDate: string;
}

export function splitInstallmentAmounts(total: number, count: number): number[] {
  if (count <= 1) return [total];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const extra = cents % count;
  return Array.from({ length: count }, (_, i) => (base + (i < extra ? 1 : 0)) / 100);
}

export function buildInstallmentDueDates(
  firstDue: string,
  count: number,
  intervalMonths = 1,
): string[] {
  return Array.from({ length: count }, (_, i) => addMonthsISO(firstDue, i * intervalMonths));
}

export function previewInstallments(
  total: number,
  firstDue: string,
  count: number,
  intervalMonths = 1,
): InstallmentPreview[] {
  const amounts = splitInstallmentAmounts(total, count);
  const dates = buildInstallmentDueDates(firstDue, count, intervalMonths);
  return amounts.map((amount, i) => ({
    number: i + 1,
    amount,
    dueDate: dates[i],
  }));
}

export async function createStandaloneSale(
  patientId: string,
  items: SaleItemInput[],
  dueDate: string,
  options?: {
    notes?: string;
    installmentCount?: number;
    installmentIntervalMonths?: number;
  },
) {
  const { data, error } = await supabase.rpc("create_standalone_sale" as never, {
    p_patient_id: patientId,
    p_items: items,
    p_due_date: dueDate,
    p_notes: options?.notes ?? null,
    p_installment_count: options?.installmentCount ?? 1,
    p_installment_interval_months: options?.installmentIntervalMonths ?? 1,
  } as never);
  if (error) throw new Error(error.message);
  return data as {
    bill_id: string;
    bill_ids?: string[];
    charge_id: string;
    amount: number;
    installment_count: number;
  };
}

export async function updateStandaloneSale(
  billId: string,
  items: SaleItemInput[],
  dueDate: string,
  options?: {
    notes?: string;
    installmentCount?: number;
    installmentIntervalMonths?: number;
  },
) {
  const { data, error } = await supabase.rpc("update_standalone_sale" as never, {
    p_bill_id: billId,
    p_items: items,
    p_due_date: dueDate,
    p_notes: options?.notes ?? null,
    p_installment_count: options?.installmentCount ?? null,
    p_installment_interval_months: options?.installmentIntervalMonths ?? 1,
  } as never);
  if (error) throw new Error(error.message);
  return data as { bill_id: string; amount: number; installment_count: number };
}

export async function addSaleItems(billId: string, items: SaleItemInput[]) {
  const { data, error } = await supabase.rpc("add_sale_items" as never, {
    p_bill_id: billId,
    p_items: items,
  } as never);
  if (error) throw new Error(error.message);
  return data as {
    bill_id: string;
    added_total: number;
    amount: number;
    status: string;
  };
}

export async function updateSaleItem(itemId: string, quantity: number) {
  const { data, error } = await supabase.rpc("update_sale_item" as never, {
    p_item_id: itemId,
    p_quantity: quantity,
  } as never);
  if (error) throw new Error(error.message);
  return data as { bill_id: string; amount: number; status: string };
}

export async function removeSaleItem(itemId: string) {
  const { data, error } = await supabase.rpc("remove_sale_item" as never, {
    p_item_id: itemId,
  } as never);
  if (error) throw new Error(error.message);
  return data as {
    bill_id: string;
    amount: number;
    status: string;
    remaining_items: number;
  };
}

export async function reverseSale(billId: string, reason?: string) {
  const { data, error } = await supabase.rpc("reverse_sale" as never, {
    p_bill_id: billId,
    p_reason: reason ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Estorna apenas as sessões restantes (não realizadas) de um pacote, ajustando
 * o valor da cobrança proporcionalmente às sessões já utilizadas.
 */
export async function reverseRemainingSessions(billId: string, reason?: string) {
  const { data, error } = await supabase.rpc("reverse_remaining_sessions" as never, {
    p_bill_id: billId,
    p_reason: reason ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data as {
    bill_id: string;
    new_amount: number;
    removed_amount: number;
    sessions_cancelled: number;
  };
}

export async function deleteBill(billId: string) {
  const row = await fetchRowForTrash("bills_receivable", billId);
  if (!row) throw new Error("Cobrança não encontrada");

  await archiveEntity({
    entityType: row.status === "budget" ? "budget" : "bill",
    table: "bills_receivable",
    id: billId,
    label: (row.description as string)?.trim() || "Cobrança",
    summary:
      row.amount != null
        ? `R$ ${Number(row.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : null,
    tenantId: row.tenant_id as string,
  });

  const { data, error } = await supabase.rpc("delete_bill" as never, {
    p_bill_id: billId,
  } as never);
  if (error) throw new Error(error.message);
  return data;
}

export async function receiveBillPayment(
  billId: string,
  amount: number,
  method: string,
  paidDate: string,
  notes?: string,
  discount = 0,
  installments = 1,
) {
  const { data, error } = await supabase.rpc("receive_bill_payment" as never, {
    p_bill_id: billId,
    p_amount: amount,
    p_method: method,
    p_paid_date: paidDate,
    p_notes: notes ?? null,
    p_discount: discount > 0 ? discount : 0,
    p_installments: installments > 1 ? installments : 1,
  } as never);
  if (error) throw new Error(error.message);
  return data as {
    bill_id: string;
    paid_amount: number;
    status: string;
    fee_amount?: number;
    net_amount?: number;
    installments?: number;
  };
}

export function billHasSaleItems(row: SaleBillRow) {
  return Boolean(row.consultation_charge_id);
}

export function billIsInstallment(row: SaleBillRow) {
  return row.installment_count != null && row.installment_count > 1;
}

export function billIsBudget(row: SaleBillRow) {
  return row.status === "budget";
}

export function billIsEditable(row: SaleBillRow) {
  return (
    row.status === "pending" &&
    Number(row.paid_amount) === 0 &&
    !row.budget_id &&
    billHasSaleItems(row)
  );
}

export function billCanReverse(row: SaleBillRow) {
  return row.status !== "cancelled" && !billIsBudget(row) && Number(row.paid_amount) === 0;
}

export function billCanDelete(row: SaleBillRow) {
  return (
    row.status !== "cancelled" &&
    !billIsBudget(row) &&
    Number(row.paid_amount) === 0 &&
    !billHasSaleItems(row)
  );
}

export function billCanReceive(row: SaleBillRow) {
  return (
    row.status !== "cancelled" &&
    !billIsBudget(row) &&
    row.status !== "paid" &&
    Number(row.amount) > Number(row.paid_amount)
  );
}

export async function convertBudgetToSale(budgetId: string) {
  const { data, error } = await supabase.rpc("convert_budget_to_sale" as never, {
    p_budget_id: budgetId,
  } as never);
  if (error) throw new Error(error.message);
  return data as {
    bill_id: string;
    charge_id: string;
    patient_id: string;
    amount: number;
  };
}

export async function loadSaleChargeItems(billId: string): Promise<SaleChargeItem[]> {
  const { data: bill } = await supabase
    .from("bills_receivable")
    .select("consultation_charge_id")
    .eq("id", billId)
    .maybeSingle();

  let chargeId = bill?.consultation_charge_id ?? null;

  if (!chargeId) {
    const { data: charge } = await supabase
      .from("consultation_charges")
      .select("id")
      .eq("bill_receivable_id", billId)
      .maybeSingle();
    chargeId = charge?.id ?? null;
  }

  if (!chargeId) return [];

  const { data, error } = await supabase
    .from("consultation_charge_items")
    .select(
      "id, service_id, quantity, unit_price, total_price, item_type, services(name, session_count)",
    )
    .eq("charge_id", chargeId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as SaleChargeItem[];
}

export interface BillSessionPackage {
  id: string;
  used_sessions: number;
  total_sessions: number;
  status: string;
  unit_price: number;
  services: { name: string } | null;
}

export async function loadBillSessionPackages(billId: string): Promise<BillSessionPackage[]> {
  const { data: bill } = await supabase
    .from("bills_receivable")
    .select("consultation_charge_id")
    .eq("id", billId)
    .maybeSingle();

  let chargeId = bill?.consultation_charge_id ?? null;
  if (!chargeId) {
    const { data: charge } = await supabase
      .from("consultation_charges")
      .select("id")
      .eq("bill_receivable_id", billId)
      .maybeSingle();
    chargeId = charge?.id ?? null;
  }

  const filters = [`bill_receivable_id.eq.${billId}`];
  if (chargeId) filters.push(`consultation_charge_id.eq.${chargeId}`);

  const { data, error } = await supabase
    .from("patient_session_packages")
    .select("id, used_sessions, total_sessions, status, unit_price, services(name)")
    .or(filters.join(","))
    .eq("status", "active")
    .order("purchased_at", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Array<
    Omit<BillSessionPackage, "unit_price"> & { unit_price: number | string }
  >;
  return rows.map((row) => ({
    ...row,
    unit_price: Number(row.unit_price ?? 0),
  }));
}
