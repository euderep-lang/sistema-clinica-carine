import { addMonthsISO } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";

export interface SaleItemInput {
  service_id: string;
  quantity: number;
  unit_price?: number;
}

export interface SaleBillRow {
  id: string;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_date: string | null;
  competence_date: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  budget_id: string | null;
  patient_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
  consultation_charge_id: string | null;
  patients: { full_name: string } | null;
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

export async function reverseSale(billId: string, reason?: string) {
  const { data, error } = await supabase.rpc("reverse_sale" as never, {
    p_bill_id: billId,
    p_reason: reason ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBill(billId: string) {
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
) {
  const { data, error } = await supabase.rpc("receive_bill_payment" as never, {
    p_bill_id: billId,
    p_amount: amount,
    p_method: method,
    p_paid_date: paidDate,
    p_notes: notes ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data as { bill_id: string; paid_amount: number; status: string };
}

export function billHasSaleItems(row: SaleBillRow) {
  return Boolean(row.consultation_charge_id);
}

export function billIsInstallment(row: SaleBillRow) {
  return row.installment_count != null && row.installment_count > 1;
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
  return row.status !== "cancelled" && Number(row.paid_amount) === 0;
}

export function billCanDelete(row: SaleBillRow) {
  return (
    row.status !== "cancelled" &&
    Number(row.paid_amount) === 0 &&
    !billHasSaleItems(row)
  );
}

export function billCanReceive(row: SaleBillRow) {
  return (
    row.status !== "cancelled" &&
    row.status !== "paid" &&
    Number(row.amount) > Number(row.paid_amount)
  );
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
    .select("id, used_sessions, total_sessions, status, services(name)")
    .or(filters.join(","))
    .eq("status", "active")
    .order("purchased_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as BillSessionPackage[];
}
