/**
 * Mensagens agendadas do CRM. O envio é processado pelo cron
 * (/api/cron/wa-follow-ups), por isso funciona com o app fechado.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeBrazilPhone } from "@/lib/wa-phone";
import { normalizeOutboundMessageBody } from "@/lib/wa-automation-quick-replies.server";
import { providerSendText, isWhatsAppConfigured } from "@/lib/whatsapp-provider.server";
import { sendMetaSocialText } from "@/lib/whatsapp-meta.server";

type ScheduledRow = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  body: string;
  created_by: string | null;
  attempts: number;
};

type ConversationRow = {
  id: string;
  contact_phone: string;
  channel: string | null;
  external_user_id: string | null;
  first_response_at: string | null;
  status: string;
};

async function deliverScheduled(row: ScheduledRow): Promise<void> {
  const { data: conv } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, channel, external_user_id, first_response_at, status")
    .eq("id", row.conversation_id)
    .maybeSingle();

  if (!conv) throw new Error("Conversa não encontrada");
  const convRow = conv as ConversationRow;

  const text = normalizeOutboundMessageBody(row.body);
  if (!text) throw new Error("Mensagem vazia");

  const channel = convRow.channel ?? "whatsapp";
  let messageId: string;

  if (channel === "instagram" || channel === "messenger") {
    const recipientId = convRow.external_user_id ?? convRow.contact_phone;
    const result = await sendMetaSocialText(recipientId, text, channel);
    messageId = result.messageId;
  } else {
    const phone = normalizeBrazilPhone(convRow.contact_phone);
    const result = await providerSendText(phone, text);
    messageId = result.messageId;
  }

  const now = new Date().toISOString();

  await supabaseAdmin.from("wa_messages" as never).insert({
    tenant_id: row.tenant_id,
    conversation_id: row.conversation_id,
    wa_message_id: messageId,
    direction: "outbound",
    message_type: "text",
    body: text,
    status: "sent",
    sent_by: row.created_by,
  } as never);

  const convUpdate: Record<string, unknown> = {
    last_message_at: now,
    last_message_preview: text.slice(0, 120),
    updated_at: now,
  };
  if (!convRow.first_response_at) convUpdate.first_response_at = now;
  if (convRow.status === "closed") {
    convUpdate.status = "open";
    convUpdate.close_reason = null;
    convUpdate.closed_at = null;
    convUpdate.closed_by = null;
  }

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update(convUpdate as never)
    .eq("id", row.conversation_id);

  await supabaseAdmin
    .from("wa_scheduled_messages" as never)
    .update({
      status: "sent",
      sent_at: now,
      wa_message_id: messageId,
      error: null,
    } as never)
    .eq("id", row.id);
}

/** Envia mensagens agendadas cujo horário já chegou. */
export async function processScheduledMessages(
  limit = 25,
): Promise<{ processed: number; sent: number; failed: number }> {
  if (!isWhatsAppConfigured()) return { processed: 0, sent: 0, failed: 0 };

  const { data: rows } = await supabaseAdmin
    .from("wa_scheduled_messages" as never)
    .select("id, tenant_id, conversation_id, body, created_by, attempts")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true })
    .limit(limit);

  const due = (rows ?? []) as ScheduledRow[];
  let sent = 0;
  let failed = 0;

  for (const row of due) {
    try {
      await deliverScheduled(row);
      sent++;
    } catch (e) {
      failed++;
      const attempts = (row.attempts ?? 0) + 1;
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      // Após 5 tentativas, marca como falha definitiva para não tentar pra sempre.
      await supabaseAdmin
        .from("wa_scheduled_messages" as never)
        .update({
          attempts,
          status: attempts >= 5 ? "failed" : "pending",
          error: message,
        } as never)
        .eq("id", row.id);
      console.error("[wa-scheduled] falha ao enviar agendada:", message);
    }
  }

  return { processed: due.length, sent, failed };
}
