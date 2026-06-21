import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function logWaAudit(input: {
  tenantId: string;
  conversationId?: string | null;
  userId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("wa_audit_log" as never).insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    details: input.details ?? null,
  } as never);
}
