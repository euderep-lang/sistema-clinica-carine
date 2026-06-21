import { s as supabase } from "../server.js";
import { aK as PAYMENT_METHODS } from "./router-D_mhnWOa.js";
function calculatePaymentFee(amount, config) {
  const fee = Math.min(
    amount,
    Math.round((amount * Number(config.fee_percent) / 100 + Number(config.fee_fixed)) * 100) / 100
  );
  return { fee, net: Math.round((amount - fee) * 100) / 100 };
}
async function loadPaymentMethodConfigs() {
  const { data, error } = await supabase.from("payment_method_configs").select("id, method, label, fee_percent, fee_fixed, active, sort_order").order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function savePaymentMethodConfig(id, patch) {
  const { error } = await supabase.from("payment_method_configs").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
async function ensurePaymentMethodConfigs(tenantId) {
  const existing = await loadPaymentMethodConfigs();
  if (existing.length > 0) return existing;
  const rows = PAYMENT_METHODS.map((m, i) => ({
    tenant_id: tenantId,
    method: m.value,
    label: m.label,
    fee_percent: m.value === "credit_card" ? 2.5 : m.value === "debit_card" ? 1.5 : 0,
    fee_fixed: 0,
    sort_order: i + 1,
    active: true
  }));
  const { data, error } = await supabase.from("payment_method_configs").insert(rows).select("id, method, label, fee_percent, fee_fixed, active, sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}
function activePaymentMethods(configs) {
  const active = configs.filter((c) => c.active);
  if (active.length === 0) return PAYMENT_METHODS;
  return active.map((c) => ({
    value: c.method,
    label: c.label,
    icon: PAYMENT_METHODS.find((m) => m.value === c.method)?.icon ?? "•",
    fee_percent: c.fee_percent,
    fee_fixed: c.fee_fixed
  }));
}
export {
  activePaymentMethods as a,
  calculatePaymentFee as c,
  ensurePaymentMethodConfigs as e,
  loadPaymentMethodConfigs as l,
  savePaymentMethodConfig as s
};
