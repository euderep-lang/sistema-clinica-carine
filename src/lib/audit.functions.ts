import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AuditLogRow {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  category: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  patient_id: string | null;
  conversation_id: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  source: string;
  created_at: string;
}

async function requireAuditAccess(
  supabase: Awaited<ReturnType<typeof import("@supabase/supabase-js").createClient>>,
  userId: string,
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile?.tenant_id) throw new Error("Perfil não encontrado");
  if (profile.role !== "admin" && profile.role !== "financial") {
    throw new Error("Sem permissão para visualizar auditoria");
  }
  return profile as { role: string; tenant_id: string };
}

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      from?: string;
      to?: string;
      category?: string;
      action?: string;
      search?: string;
      source?: string;
      limit?: number;
      offset?: number;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireAuditAccess(supabase, userId);
    const limit = Math.min(data.limit ?? 100, 200);
    const offset = data.offset ?? 0;

    let q = supabaseAdmin
      .from("system_audit_log" as never)
      .select("*", { count: "exact" })
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.from) q = q.gte("created_at", `${data.from}T00:00:00`);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59`);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    if (data.source && data.source !== "all") q = q.eq("source", data.source);
    if (data.action && data.action !== "all") q = q.eq("action", data.action);
    if (data.search?.trim()) {
      const term = `%${data.search.trim()}%`;
      q = q.or(`summary.ilike.${term},actor_name.ilike.${term},action.ilike.${term}`);
    }

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    return {
      rows: (rows ?? []) as AuditLogRow[],
      total: count ?? 0,
    };
  });
