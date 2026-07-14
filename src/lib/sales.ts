import { addMonthsISO } from "@/lib/locale";
import { supabase } from "@/integrations/supabase/client";
import type { FeeBearer } from "@/lib/payment-methods";
import { archiveEntity, fetchRowForTrash } from "@/lib/trash";

export interface SaleItemInventoryInput {
  inventory_item_id: string;
  quantity: number;
}

export interface SaleItemInput {
  service_id: string;
  quantity: number;
  unit_price?: number;
  inventory_items?: SaleItemInventoryInput[];
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

export async function updateSaleItem(itemId: string, quantity: number, unitPrice?: number) {
  const { data, error } = await supabase.rpc("update_sale_item" as never, {
    p_item_id: itemId,
    p_quantity: quantity,
    p_unit_price: unitPrice != null && unitPrice > 0 ? unitPrice : null,
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
  feeBearer: FeeBearer = "company",
) {
  const { data, error } = await supabase.rpc("receive_bill_payment" as never, {
    p_bill_id: billId,
    p_amount: amount,
    p_method: method,
    p_paid_date: paidDate,
    p_notes: notes ?? null,
    p_discount: discount > 0 ? discount : 0,
    p_installments: installments > 1 ? installments : 1,
    p_fee_bearer: feeBearer,
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
  return row.status !== "cancelled" && !billIsBudget(row);
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

export interface SaleItemInsumo {
  name: string;
  quantity: number;
  unit: string;
}

async function resolveChargeIdForBill(billId: string): Promise<string | null> {
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

  return chargeId;
}

/** Insumos por procedimento (service_id) vinculados à venda/consulta. */
export async function loadSaleItemInsumosByBill(
  billId: string,
): Promise<Record<string, SaleItemInsumo[]>> {
  const chargeId = await resolveChargeIdForBill(billId);
  if (!chargeId) return {};

  const { data: packages, error: pkgError } = await supabase
    .from("patient_session_packages")
    .select(
      "service_id, session_package_inventory_items(quantity, inventory_items(name, unit))",
    )
    .eq("consultation_charge_id", chargeId);

  if (pkgError) throw new Error(pkgError.message);

  const result: Record<string, SaleItemInsumo[]> = {};
  const servicesNeedingDefault = new Set<string>();

  for (const pkg of packages ?? []) {
    const serviceId = pkg.service_id as string;
    const packageItems = (pkg.session_package_inventory_items ?? []) as Array<{
      quantity: number | string;
      inventory_items: { name: string; unit: string } | null;
    }>;

    if (packageItems.length > 0) {
      result[serviceId] = packageItems
        .filter((row) => row.inventory_items?.name)
        .map((row) => ({
          name: row.inventory_items!.name,
          quantity: Number(row.quantity),
          unit: row.inventory_items!.unit,
        }));
    } else if (!result[serviceId]) {
      servicesNeedingDefault.add(serviceId);
    }
  }

  if (servicesNeedingDefault.size > 0) {
    const { data: linked, error: linkError } = await supabase
      .from("service_inventory_items")
      .select("service_id, quantity, inventory_items(name, unit)")
      .in("service_id", [...servicesNeedingDefault]);

    if (linkError) throw new Error(linkError.message);

    for (const row of linked ?? []) {
      const serviceId = row.service_id as string;
      if (result[serviceId]?.length) continue;
      const item = row.inventory_items as { name: string; unit: string } | null;
      if (!item?.name) continue;
      if (!result[serviceId]) result[serviceId] = [];
      result[serviceId].push({
        name: item.name,
        quantity: Number(row.quantity),
        unit: item.unit,
      });
    }
  }

  return result;
}

export async function loadSaleChargeItems(billId: string): Promise<SaleChargeItem[]> {
  const chargeId = await resolveChargeIdForBill(billId);
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

export async function updateSessionPackageInsumo(
  packageId: string,
  inventoryItemId: string,
  quantity = 1,
): Promise<void> {
  const table = "session_package_inventory_items" as never;
  const { error: delError } = await supabase.from(table).delete().eq("package_id" as never, packageId);
  if (delError) throw new Error(delError.message);

  const { error: insError } = await supabase.from(table).insert({
    package_id: packageId,
    inventory_item_id: inventoryItemId,
    quantity,
  } as never);
  if (insError) throw new Error(insError.message);
}

type RawPackageInventoryRow = {
  id: string;
  inventory_item_id: string;
  quantity: number | string;
  inventory_items: { name: string } | { name: string }[] | null;
};

/** Primeiro insumo do pacote (vendas de Injetáveis IM usam 1). */
export function parsePackageLinkedInsumo(
  rows: RawPackageInventoryRow[] | null | undefined,
): { linkId: string; inventoryItemId: string; name: string; quantity: number } | null {
  const row = rows?.[0];
  if (!row) return null;
  const inv = row.inventory_items;
  const name = Array.isArray(inv) ? inv[0]?.name : inv?.name;
  return {
    linkId: row.id,
    inventoryItemId: row.inventory_item_id,
    name: name ?? "Insumo",
    quantity: Number(row.quantity) || 1,
  };
}
