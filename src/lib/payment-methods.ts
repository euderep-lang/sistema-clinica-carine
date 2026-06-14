import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS } from "@/lib/currency";

export interface PaymentMethodConfig {
  id: string;
  method: string;
  label: string;
  fee_percent: number;
  fee_fixed: number;
  active: boolean;
  sort_order: number;
}

export function calculatePaymentFee(
  amount: number,
  config: Pick<PaymentMethodConfig, "fee_percent" | "fee_fixed">,
): { fee: number; net: number } {
  const fee = Math.min(
    amount,
    Math.round((amount * Number(config.fee_percent) / 100 + Number(config.fee_fixed)) * 100) /
      100,
  );
  return { fee, net: Math.round((amount - fee) * 100) / 100 };
}

export async function loadPaymentMethodConfigs(): Promise<PaymentMethodConfig[]> {
  const { data, error } = await supabase
    .from("payment_method_configs" as never)
    .select("id, method, label, fee_percent, fee_fixed, active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentMethodConfig[];
}

export async function savePaymentMethodConfig(
  id: string,
  patch: Partial<Pick<PaymentMethodConfig, "label" | "fee_percent" | "fee_fixed" | "active">>,
) {
  const { error } = await supabase
    .from("payment_method_configs" as never)
    .update(patch as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function ensurePaymentMethodConfigs(tenantId: string) {
  const existing = await loadPaymentMethodConfigs();
  if (existing.length > 0) return existing;

  const rows = PAYMENT_METHODS.map((m, i) => ({
    tenant_id: tenantId,
    method: m.value,
    label: m.label,
    fee_percent: m.value === "credit_card" ? 2.5 : m.value === "debit_card" ? 1.5 : 0,
    fee_fixed: 0,
    sort_order: i + 1,
    active: true,
  }));

  const { data, error } = await supabase
    .from("payment_method_configs" as never)
    .insert(rows as never)
    .select("id, method, label, fee_percent, fee_fixed, active, sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentMethodConfig[];
}

export function getMethodConfig(
  configs: PaymentMethodConfig[],
  method: string,
): PaymentMethodConfig | undefined {
  return configs.find((c) => c.method === method && c.active);
}

export function activePaymentMethods(configs: PaymentMethodConfig[]) {
  const active = configs.filter((c) => c.active);
  if (active.length === 0) return PAYMENT_METHODS;
  return active.map((c) => ({
    value: c.method,
    label: c.label,
    icon: PAYMENT_METHODS.find((m) => m.value === c.method)?.icon ?? "•",
    fee_percent: c.fee_percent,
    fee_fixed: c.fee_fixed,
  }));
}
