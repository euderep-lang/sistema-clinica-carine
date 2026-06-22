import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAuditSafe } from "@/lib/audit.server";

export type CommissionAuditAction =
  | "financial.commission_applied"
  | "financial.commission_period_saved"
  | "financial.commission_period_closed"
  | "financial.commission_period_reopened";

export interface LogCommissionAuditInput {
  action: CommissionAuditAction;
  summary: string;
  periodYear: number;
  periodMonth: number;
  professionalId?: string | null;
  professionalName?: string | null;
  baseCommissionPct?: number | null;
  adjustedCommissionPct?: number | null;
  commissionAmount?: number | null;
  receivedTotal?: number | null;
  productionTotal?: number | null;
  notes?: string | null;
  professionalsCount?: number | null;
  totalCommission?: number | null;
}

export const logCommissionAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: LogCommissionAuditInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile?.tenant_id) throw new Error("Perfil não encontrado");
    if (profile.role !== "admin" && profile.role !== "financial") {
      throw new Error("Sem permissão para registrar auditoria de comissão");
    }

    logAuditSafe({
      tenantId: profile.tenant_id,
      actorId: userId,
      category: "financial",
      action: data.action,
      summary: data.summary,
      entityType: "commission_closing",
      entityId: data.professionalId ?? null,
      details: {
        period_year: data.periodYear,
        period_month: data.periodMonth,
        professional_id: data.professionalId ?? null,
        professional_name: data.professionalName ?? null,
        base_commission_pct: data.baseCommissionPct ?? null,
        adjusted_commission_pct: data.adjustedCommissionPct ?? null,
        commission_amount: data.commissionAmount ?? null,
        received_total: data.receivedTotal ?? null,
        production_total: data.productionTotal ?? null,
        notes: data.notes ?? null,
        professionals_count: data.professionalsCount ?? null,
        total_commission: data.totalCommission ?? null,
      },
      source: "ui",
    });

    return { ok: true };
  });
