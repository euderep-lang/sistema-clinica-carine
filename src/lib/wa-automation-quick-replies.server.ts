import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getFollowUpSequencesServer } from "@/lib/wa-tenant-settings.server";
import {
  AUTOMATION_SHORTCUT_PREFIX,
  buildAutomationQuickReplyRows,
  LEGACY_AUTOMATION_SHORTCUTS,
  normalizeMessageLineBreaks,
} from "@/lib/wa-automation-quick-replies";

/** Sincroniza wa_quick_replies com os modelos de automação salvos na config. */
export async function syncAutomationQuickReplies(tenantId: string): Promise<{ updated: number }> {
  const sequences = await getFollowUpSequencesServer(tenantId);
  const rows = buildAutomationQuickReplyRows(sequences);
  const validShortcuts = rows.map((r) => r.shortcut);

  if (LEGACY_AUTOMATION_SHORTCUTS.length) {
    await supabaseAdmin
      .from("wa_quick_replies" as never)
      .delete()
      .eq("tenant_id", tenantId)
      .in("shortcut", [...LEGACY_AUTOMATION_SHORTCUTS] as never);
  }

  if (validShortcuts.length) {
    const { data: stale } = await supabaseAdmin
      .from("wa_quick_replies" as never)
      .select("id, shortcut")
      .eq("tenant_id", tenantId)
      .like("shortcut", `${AUTOMATION_SHORTCUT_PREFIX}%`);

    const staleIds = ((stale ?? []) as { id: string; shortcut: string }[])
      .filter((r) => !validShortcuts.includes(r.shortcut))
      .map((r) => r.id);

    if (staleIds.length) {
      await supabaseAdmin.from("wa_quick_replies" as never).delete().in("id", staleIds);
    }
  }

  let updated = 0;
  for (const row of rows) {
    const { data: existing } = await supabaseAdmin
      .from("wa_quick_replies" as never)
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("shortcut", row.shortcut)
      .maybeSingle();

    const payload = {
      tenant_id: tenantId,
      name: row.name,
      content: row.content,
      category: row.category,
      shortcut: row.shortcut,
      sort_order: row.sort_order,
      active: true,
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from("wa_quick_replies" as never)
        .update(payload as never)
        .eq("id", (existing as { id: string }).id);
      if (!error) updated++;
    } else {
      const { error } = await supabaseAdmin.from("wa_quick_replies" as never).insert(payload as never);
      if (!error) updated++;
    }
  }

  return { updated };
}

export function normalizeOutboundMessageBody(body: string): string {
  return normalizeMessageLineBreaks(body);
}
