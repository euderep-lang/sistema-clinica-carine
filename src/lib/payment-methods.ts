import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_LABEL, PAYMENT_METHODS } from "@/lib/currency";

/** Mapa de taxas por nº de parcelas: { "1": 2.5, "2": 3.1, ... }. */
export type InstallmentFees = Record<string, number>;

/** Quem assume a taxa de transação no recebimento. */
export type FeeBearer = "company" | "client";

export interface PaymentMethodConfig {
  id: string;
  method: string;
  label: string;
  fee_percent: number;
  fee_fixed: number;
  active: boolean;
  sort_order: number;
  is_custom?: boolean;
  supports_installments: boolean;
  max_installments: number;
  settlement_days: number;
  installment_fees: InstallmentFees;
}

const CONFIG_SELECT =
  "id, method, label, fee_percent, fee_fixed, active, sort_order, is_custom, supports_installments, max_installments, settlement_days, installment_fees";

function normalizeConfig(raw: Record<string, unknown>): PaymentMethodConfig {
  let fees: InstallmentFees = {};
  const rawFees = raw.installment_fees;
  if (rawFees && typeof rawFees === "object") {
    fees = Object.fromEntries(
      Object.entries(rawFees as Record<string, unknown>).map(([k, v]) => [k, Number(v) || 0]),
    );
  }
  return {
    id: raw.id as string,
    method: raw.method as string,
    label: raw.label as string,
    fee_percent: Number(raw.fee_percent ?? 0),
    fee_fixed: Number(raw.fee_fixed ?? 0),
    active: Boolean(raw.active),
    sort_order: Number(raw.sort_order ?? 0),
    is_custom: Boolean(raw.is_custom),
    supports_installments: Boolean(raw.supports_installments),
    max_installments: Number(raw.max_installments ?? 12) || 12,
    settlement_days: Number(raw.settlement_days ?? 0) || 0,
    installment_fees: fees,
  };
}

/** Percentual da taxa para um dado nº de parcelas (fallback: fee_percent). */
export function feePercentForInstallments(
  config: Pick<PaymentMethodConfig, "fee_percent" | "installment_fees">,
  installments: number,
): number {
  const n = Math.max(1, Math.floor(installments) || 1);
  const specific = config.installment_fees?.[String(n)];
  if (specific != null && Number.isFinite(specific)) return Number(specific);
  return Number(config.fee_percent) || 0;
}

/**
 * Registro dinâmico de rótulos (inclui formas personalizadas). Preenchido como
 * efeito colateral de loadPaymentMethodConfigs(), para que paymentLabel()
 * resolva nomes de métodos customizados em telas de exibição.
 */
const labelRegistry: Record<string, string> = {};
let configCache: PaymentMethodConfig[] | null = null;

/** Limpa o cache (chamar após salvar/criar/remover formas de pagamento). */
export function invalidatePaymentMethodConfigs() {
  configCache = null;
}

/** Retorna o cache atual (útil enquanto recarrega). */
export function getCachedPaymentMethodConfigs(): PaymentMethodConfig[] {
  return configCache ?? [];
}

/** Resolve o rótulo de uma forma de pagamento (customizada ou padrão). */
export function paymentLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return labelRegistry[method] ?? PAYMENT_LABEL[method] ?? method;
}

/** Gera um slug válido (a-z, 0-9, _) a partir de um nome livre. */
export function slugifyPaymentMethod(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function calculatePaymentFee(
  amount: number,
  config: Pick<PaymentMethodConfig, "fee_percent" | "fee_fixed" | "installment_fees">,
  installments = 1,
): { fee: number; net: number } {
  const percent = config.installment_fees
    ? feePercentForInstallments(
        { fee_percent: config.fee_percent, installment_fees: config.installment_fees },
        installments,
      )
    : Number(config.fee_percent) || 0;
  const fee = Math.min(
    amount,
    Math.round(((amount * percent) / 100 + Number(config.fee_fixed)) * 100) / 100,
  );
  return { fee, net: Math.round((amount - fee) * 100) / 100 };
}

export async function loadPaymentMethodConfigs(force = false): Promise<PaymentMethodConfig[]> {
  if (!force && configCache) return configCache;

  const { data, error } = await supabase
    .from("payment_method_configs" as never)
    .select(CONFIG_SELECT)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Record<string, unknown>[]).map(normalizeConfig);
  for (const r of rows) labelRegistry[r.method] = r.label;
  configCache = rows;
  return rows;
}

export async function savePaymentMethodConfig(
  id: string,
  patch: Partial<
    Pick<
      PaymentMethodConfig,
      | "label"
      | "fee_percent"
      | "fee_fixed"
      | "active"
      | "supports_installments"
      | "max_installments"
      | "settlement_days"
      | "installment_fees"
    >
  >,
) {
  const { error } = await supabase
    .from("payment_method_configs" as never)
    .update(patch as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
  invalidatePaymentMethodConfigs();
}

export async function createPaymentMethodConfig(input: {
  tenantId: string;
  label: string;
  feePercent?: number;
  feeFixed?: number;
  sortOrder?: number;
  supportsInstallments?: boolean;
  settlementDays?: number;
}): Promise<PaymentMethodConfig> {
  const label = input.label.trim();
  if (!label) throw new Error("Informe o nome da forma de pagamento");

  const baseSlug = slugifyPaymentMethod(label);
  if (!baseSlug) throw new Error("Nome inválido para forma de pagamento");

  const existing = await loadPaymentMethodConfigs();
  let method = baseSlug;
  let suffix = 2;
  while (existing.some((m) => m.method === method)) {
    method = `${baseSlug}_${suffix++}`;
  }
  const sortOrder =
    input.sortOrder ?? (existing.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1);

  const { data, error } = await supabase
    .from("payment_method_configs" as never)
    .insert({
      tenant_id: input.tenantId,
      method,
      label,
      fee_percent: input.feePercent ?? 0,
      fee_fixed: input.feeFixed ?? 0,
      sort_order: sortOrder,
      active: true,
      is_custom: true,
      supports_installments: input.supportsInstallments ?? false,
      settlement_days: input.settlementDays ?? 0,
    } as never)
    .select(CONFIG_SELECT)
    .single();

  if (error) throw new Error(error.message);
  const row = normalizeConfig(data as Record<string, unknown>);
  labelRegistry[row.method] = row.label;
  invalidatePaymentMethodConfigs();
  return row;
}

export async function deletePaymentMethodConfig(id: string) {
  const { error } = await supabase
    .from("payment_method_configs" as never)
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  invalidatePaymentMethodConfigs();
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
    supports_installments: m.value === "credit_card",
    settlement_days: m.value === "credit_card" ? 30 : m.value === "debit_card" ? 1 : 0,
  }));

  const { data, error } = await supabase
    .from("payment_method_configs" as never)
    .insert(rows as never)
    .select(CONFIG_SELECT);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeConfig);
}

export function getMethodConfig(
  configs: PaymentMethodConfig[],
  method: string,
): PaymentMethodConfig | undefined {
  return configs.find((c) => c.method === method && c.active);
}

export interface ActivePaymentMethod {
  value: string;
  label: string;
  icon: string;
  fee_percent: number;
  fee_fixed: number;
  supports_installments: boolean;
  max_installments: number;
  settlement_days: number;
  installment_fees: InstallmentFees;
}

export function activePaymentMethods(configs?: PaymentMethodConfig[]): ActivePaymentMethod[] {
  const source =
    configs && configs.length > 0 ? configs : getCachedPaymentMethodConfigs();
  const active = source.filter((c) => c.active);
  if (active.length === 0) {
    return PAYMENT_METHODS.map((m) => ({
      value: m.value,
      label: m.label,
      icon: m.icon,
      fee_percent: 0,
      fee_fixed: 0,
      supports_installments: false,
      max_installments: 12,
      settlement_days: 0,
      installment_fees: {},
    }));
  }
  return active.map((c) => ({
    value: c.method,
    label: c.label,
    icon: PAYMENT_METHODS.find((m) => m.value === c.method)?.icon ?? "•",
    fee_percent: c.fee_percent,
    fee_fixed: c.fee_fixed,
    supports_installments: c.supports_installments,
    max_installments: c.max_installments,
    settlement_days: c.settlement_days,
    installment_fees: c.installment_fees,
  }));
}
