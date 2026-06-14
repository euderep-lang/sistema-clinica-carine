import { supabase } from "@/integrations/supabase/client";

export interface BillPaymentRow {
  id: string;
  bill_receivable_id: string;
  amount: number;
  fee_amount: number | null;
  net_amount: number | null;
  payment_method: string;
  paid_date: string;
  notes: string | null;
  status: string;
  reversed_at: string | null;
  reversal_reason: string | null;
  created_at: string;
  patients: { full_name: string } | null;
  bills_receivable: {
    description: string;
    amount: number;
    installment_number: number | null;
    installment_count: number | null;
  } | null;
  created_by_profile: { full_name: string } | null;
}

export async function loadBillPayments(options?: {
  billId?: string;
  limit?: number;
}): Promise<BillPaymentRow[]> {
  let query = supabase
    .from("bill_payments" as never)
    .select(
      "id, bill_receivable_id, amount, fee_amount, net_amount, payment_method, paid_date, notes, status, reversed_at, reversal_reason, created_at, patients(full_name), bills_receivable(description, amount, installment_number, installment_count), created_by_profile:created_by(full_name)",
    )
    .order("paid_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.billId) {
    query = query.eq("bill_receivable_id", options.billId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as BillPaymentRow[];
}

export async function reverseBillPayment(paymentId: string, reason?: string) {
  const { data, error } = await supabase.rpc("reverse_bill_payment" as never, {
    p_payment_id: paymentId,
    p_reason: reason ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data as { payment_id: string; bill_id: string; paid_amount: number; status: string };
}

export function paymentCanReverse(row: BillPaymentRow) {
  return row.status === "active";
}
