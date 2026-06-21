import { supabaseAdmin } from "@/integrations/supabase/client.server";

type TagRule = {
  id: string;
  tag_id: string;
  trigger_type: string;
  trigger_value: string | null;
};

export async function applyWaTagRules(input: {
  tenantId: string;
  conversationId: string;
  channel: string;
  messageBody: string;
  isFirstInbound: boolean;
  pipelineStageId?: string | null;
}) {
  const { data: rules } = await supabaseAdmin
    .from("wa_tag_rules" as never)
    .select("id, tag_id, trigger_type, trigger_value")
    .eq("tenant_id", input.tenantId)
    .eq("active", true);

  if (!rules?.length) return;

  const bodyLower = input.messageBody.toLowerCase();
  const tagsToApply = new Set<string>();

  for (const rule of rules as TagRule[]) {
    switch (rule.trigger_type) {
      case "keyword": {
        const kw = (rule.trigger_value ?? "").trim().toLowerCase();
        if (kw && bodyLower.includes(kw)) tagsToApply.add(rule.tag_id);
        break;
      }
      case "first_message":
        if (input.isFirstInbound) tagsToApply.add(rule.tag_id);
        break;
      case "channel": {
        const ch = (rule.trigger_value ?? "").trim().toLowerCase();
        if (ch && ch === input.channel) tagsToApply.add(rule.tag_id);
        break;
      }
      case "pipeline_stage":
        if (rule.trigger_value && rule.trigger_value === input.pipelineStageId) {
          tagsToApply.add(rule.tag_id);
        }
        break;
    }
  }

  for (const tagId of tagsToApply) {
    await supabaseAdmin
      .from("wa_conversation_tags" as never)
      .upsert({ conversation_id: input.conversationId, tag_id: tagId } as never, {
        onConflict: "conversation_id,tag_id",
        ignoreDuplicates: true,
      });
  }
}

export async function isFirstInboundMessage(conversationId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound");
  return (count ?? 0) <= 1;
}
