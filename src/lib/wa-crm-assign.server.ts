import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Primeiro recepcionista ativo do tenant; se não houver, admin do tenant (fila compartilhada). */
export async function getDefaultReceptionAssignee(tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "receptionist")
    .order("full_name")
    .limit(1)
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: admin } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "admin")
    .order("full_name")
    .limit(1)
    .maybeSingle();

  return admin?.id ?? null;
}

export async function assignOpenConversationsToReception(
  tenantId: string,
  options?: { onlyUnassigned?: boolean },
) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  if (!receptionistId) {
    return { updated: 0, receptionistId: null as string | null };
  }

  const now = new Date().toISOString();
  let q = supabaseAdmin
    .from("wa_conversations" as never)
    .update({ assigned_to: receptionistId, updated_at: now } as never)
    .eq("tenant_id", tenantId)
    .eq("status", "open");

  if (options?.onlyUnassigned !== false) {
    q = q.is("assigned_to", null);
  }

  const { data, error } = await q.select("id");
  if (error) throw new Error(error.message);

  return { updated: data?.length ?? 0, receptionistId };
}

export async function ensureConversationAssignedToReception(tenantId: string, conversationId: string) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  if (!receptionistId) return false;

  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("assigned_to, status")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const row = conv as { assigned_to: string | null; status: string } | null;
  if (!row || row.status !== "open" || row.assigned_to) return false;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ assigned_to: receptionistId, updated_at: new Date().toISOString() } as never)
    .eq("id", conversationId);

  return true;
}
