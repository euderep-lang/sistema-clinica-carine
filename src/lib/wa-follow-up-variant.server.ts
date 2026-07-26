import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FOLLOW_UP_VARIANT_COUNT, padTemplatesToFive } from "@/lib/wa-follow-up-templates";

/**
 * Escolhe a próxima variação (0–4) para paciente ou conversa e avança o cursor.
 * Sem sujeito (sem patient/conversation): retorna sempre a variação 0.
 */
export async function pickAndAdvanceMessageVariant(input: {
  tenantId: string;
  stepKey: string;
  patientId?: string | null;
  conversationId?: string | null;
  templates: string[];
}): Promise<{ index: number; template: string }> {
  const templates = padTemplatesToFive(input.templates);
  const patientId = input.patientId?.trim() || null;
  const conversationId = patientId ? null : input.conversationId?.trim() || null;

  if (!patientId && !conversationId) {
    return { index: 0, template: templates[0] ?? "" };
  }

  let query = supabaseAdmin
    .from("wa_message_variant_cursor" as never)
    .select("id, last_index")
    .eq("tenant_id", input.tenantId)
    .eq("step_key", input.stepKey);

  if (patientId) {
    query = query.eq("patient_id", patientId);
  } else {
    query = query.eq("conversation_id", conversationId!);
  }

  const { data: existing } = await query.maybeSingle();
  const lastIndex =
    typeof (existing as { last_index?: number } | null)?.last_index === "number"
      ? (existing as { last_index: number }).last_index
      : -1;
  const nextIndex = ((lastIndex + 1) % FOLLOW_UP_VARIANT_COUNT + FOLLOW_UP_VARIANT_COUNT) % FOLLOW_UP_VARIANT_COUNT;

  const row = {
    tenant_id: input.tenantId,
    step_key: input.stepKey,
    patient_id: patientId,
    conversation_id: conversationId,
    last_index: nextIndex,
    updated_at: new Date().toISOString(),
  };

  if ((existing as { id?: string } | null)?.id) {
    await supabaseAdmin
      .from("wa_message_variant_cursor" as never)
      .update({
        last_index: nextIndex,
        updated_at: row.updated_at,
      } as never)
      .eq("id", (existing as { id: string }).id);
  } else {
    await supabaseAdmin.from("wa_message_variant_cursor" as never).insert(row as never);
  }

  return { index: nextIndex, template: templates[nextIndex] ?? templates[0] ?? "" };
}
