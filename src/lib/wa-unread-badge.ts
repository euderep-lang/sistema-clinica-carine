import type { Role } from "@/lib/mock-auth";
import { supabase } from "@/integrations/supabase/client";

/** Total de mensagens não lidas relevantes para o badge do PWA. */
export async function fetchWaUnreadBadgeCount(
  tenantId: string,
  userId: string,
  role: Role,
): Promise<number> {
  if (role === "admin" || role === "receptionist") {
    const { data } = await supabase
      .from("wa_conversations" as never)
      .select("unread_count")
      .eq("tenant_id", tenantId)
      .gt("unread_count", 0);

    return ((data ?? []) as { unread_count: number }[]).reduce(
      (sum, row) => sum + (row.unread_count ?? 0),
      0,
    );
  }

  if (role === "professional") {
    const [convRes, transferRes] = await Promise.all([
      supabase
        .from("wa_conversations" as never)
        .select("unread_count")
        .eq("tenant_id", tenantId)
        .eq("assigned_to", userId)
        .gt("unread_count", 0),
      supabase
        .from("wa_transfers" as never)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("to_user_id", userId)
        .is("seen_at", null),
    ]);

    const convUnread = ((convRes.data ?? []) as { unread_count: number }[]).reduce(
      (sum, row) => sum + (row.unread_count ?? 0),
      0,
    );
    return convUnread + (transferRes.count ?? 0);
  }

  return 0;
}
