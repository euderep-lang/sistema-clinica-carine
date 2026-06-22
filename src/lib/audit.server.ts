import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AuditCategory } from "@/lib/audit-labels";

export interface LogAuditInput {
  tenantId: string;
  actorId?: string | null;
  category: AuditCategory | string;
  action: string;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  patientId?: string | null;
  conversationId?: string | null;
  details?: Record<string, unknown> | null;
  source?: "ui" | "cron" | "webhook" | "rpc" | "automation" | "system";
}

export async function logAudit(input: LogAuditInput): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("write_system_audit" as never, {
    p_tenant_id: input.tenantId,
    p_actor_id: input.actorId ?? null,
    p_category: input.category,
    p_action: input.action,
    p_summary: input.summary,
    p_entity_type: input.entityType ?? null,
    p_entity_id: input.entityId ?? null,
    p_patient_id: input.patientId ?? null,
    p_conversation_id: input.conversationId ?? null,
    p_details: input.details ?? null,
    p_source: input.source ?? "system",
  } as never);

  if (error) {
    console.error("[audit] failed to write:", error.message, input.action);
    return null;
  }

  return (data as string | null) ?? null;
}

/** Não interrompe o fluxo principal se a auditoria falhar. */
export function logAuditSafe(input: LogAuditInput): void {
  void logAudit(input).catch((e) => console.error("[audit]", e));
}
