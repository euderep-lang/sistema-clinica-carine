import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  findConversationByPhone,
  normalizeBrazilPhone,
  phoneTail11,
  phonesMatch,
} from "@/lib/wa-phone";
import {
  DEFAULT_AFTER_HOURS_MESSAGE,
  isWithinBusinessHours,
  shouldSendAfterHoursReply,
} from "@/lib/wa-business-hours";
import { logWaAudit } from "@/lib/wa-audit.server";
import {
  assignOpenConversationsToReception,
  ensureConversationAssignedToReception,
  getDefaultReceptionAssignee,
} from "@/lib/wa-crm-assign.server";
import { getAfterHoursMessageServer, getBusinessHoursServer } from "@/lib/wa-tenant-settings.server";
import { applyWaTagRules, isFirstInboundMessage } from "@/lib/wa-tag-automation.server";
import { providerSendText, isWhatsAppConfigured } from "@/lib/whatsapp-provider.server";

export async function resolveTenantId(): Promise<string | null> {
  const { data } = await supabaseAdmin.from("tenants").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function findPatientByPhone(tenantId: string, phoneDigits: string) {
  const matches = await findPatientsByPhone(tenantId, phoneDigits);
  return matches.length === 1 ? matches[0]! : null;
}

/** Retorna todos os pacientes com o mesmo celular (pode haver duplicata no cadastro). */
export async function findPatientsByPhone(tenantId: string, phoneDigits: string) {
  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("id, full_name, phone")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  if (!patients?.length) return [];
  const normalized = normalizeBrazilPhone(phoneDigits);
  return patients.filter((p) => phonesMatch(p.phone ?? "", normalized));
}

type ConversationRow = {
  id: string;
  contact_phone: string;
  unread_count: number;
  contact_name: string | null;
  status: string;
  last_after_hours_reply_at: string | null;
  patient_id: string | null;
  last_message_at: string | null;
  created_at: string;
};

async function findConversationByPhoneTail(tenantId: string, phone: string) {
  const tail = phoneTail11(phone);
  if (!tail) return null;

  const { data: byTail } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select(
      "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
    )
    .eq("tenant_id", tenantId)
    .eq("phone_tail", tail)
    .maybeSingle();

  if (byTail) return byTail as ConversationRow;

  const { data: allConvs } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select(
      "id, contact_phone, unread_count, contact_name, status, last_after_hours_reply_at, patient_id, last_message_at, created_at",
    )
    .eq("tenant_id", tenantId);

  return findConversationByPhone((allConvs ?? []) as ConversationRow[], phone);
}

/** Move mensagens/notas de conversas duplicadas para a conversa principal. */
export async function mergeDuplicateConversations(tenantId: string, keeperId: string, phone: string) {
  const tail = phoneTail11(phone);
  const { data: dupes } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, contact_phone, unread_count, last_message_at, last_message_preview")
    .eq("tenant_id", tenantId)
    .neq("id", keeperId);

  const toMerge = ((dupes ?? []) as {
    id: string;
    contact_phone: string;
    unread_count: number;
    last_message_at: string | null;
    last_message_preview: string | null;
  }[]).filter((d) => phonesMatch(d.contact_phone, phone) || (tail && phoneTail11(d.contact_phone) === tail));

  if (!toMerge.length) return keeperId;

  let extraUnread = 0;
  let bestLastAt: string | null = null;
  let bestPreview: string | null = null;

  for (const dupe of toMerge) {
    extraUnread += dupe.unread_count ?? 0;
    if (dupe.last_message_at && (!bestLastAt || dupe.last_message_at > bestLastAt)) {
      bestLastAt = dupe.last_message_at;
      bestPreview = dupe.last_message_preview;
    }

    await supabaseAdmin.from("wa_messages" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_notes" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_reminders" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_transfers" as never).update({ conversation_id: keeperId } as never).eq("conversation_id", dupe.id);

    const { data: tagRows } = await supabaseAdmin
      .from("wa_conversation_tags" as never)
      .select("tag_id")
      .eq("conversation_id", dupe.id);
    for (const row of (tagRows ?? []) as { tag_id: string }[]) {
      await supabaseAdmin
        .from("wa_conversation_tags" as never)
        .upsert({ conversation_id: keeperId, tag_id: row.tag_id } as never, { onConflict: "conversation_id,tag_id", ignoreDuplicates: true });
    }
    await supabaseAdmin.from("wa_conversation_tags" as never).delete().eq("conversation_id", dupe.id);
    await supabaseAdmin.from("wa_conversations" as never).delete().eq("id", dupe.id);
  }

  const { data: keeper } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("unread_count, last_message_at, last_message_preview")
    .eq("id", keeperId)
    .maybeSingle();

  const k = keeper as { unread_count: number; last_message_at: string | null; last_message_preview: string | null } | null;
  const mergedLastAt =
    [k?.last_message_at, bestLastAt].filter(Boolean).sort().reverse()[0] ?? null;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({
      contact_phone: phone,
      unread_count: (k?.unread_count ?? 0) + extraUnread,
      last_message_at: mergedLastAt,
      last_message_preview:
        mergedLastAt === bestLastAt ? bestPreview ?? k?.last_message_preview : k?.last_message_preview,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", keeperId);

  return keeperId;
}

export async function upsertConversation(
  tenantId: string,
  fromPhone: string,
  contactName: string | null,
  preview: string,
  timestamp: Date,
  options?: { incrementUnread?: boolean },
) {
  const phone = normalizeBrazilPhone(fromPhone);
  if (!phone) {
    throw new Error(`Telefone inválido para conversa WhatsApp: ${fromPhone || "(vazio)"}`);
  }
  const autoPatient = await findPatientByPhone(tenantId, phone);
  const existing = await findConversationByPhoneTail(tenantId, phone);
  const receptionistId = await getDefaultReceptionAssignee(tenantId);

  if (existing) {
    const row = existing;
    const incrementUnread = options?.incrementUnread ?? true;
    const wasClosed = row.status === "closed";
    const resolvedPatientId = row.patient_id ?? autoPatient?.id ?? null;

    let displayName = row.contact_name ?? contactName ?? phone;
    if (resolvedPatientId) {
      const { data: linked } = await supabaseAdmin
        .from("patients")
        .select("full_name")
        .eq("id", resolvedPatientId)
        .maybeSingle();
      displayName = linked?.full_name ?? displayName;
    } else if (autoPatient) {
      displayName = autoPatient.full_name;
    }

    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        patient_id: resolvedPatientId,
        contact_name: displayName,
        contact_phone: phone,
        contact_wa_id: fromPhone,
        last_message_at: timestamp.toISOString(),
        last_message_preview: preview,
        unread_count: incrementUnread ? row.unread_count + 1 : row.unread_count,
        updated_at: new Date().toISOString(),
        status: "open",
        ...(row.assigned_to ? {} : receptionistId ? { assigned_to: receptionistId } : {}),
        ...(wasClosed
          ? { close_reason: null, closed_at: null, closed_by: null }
          : {}),
      } as never)
      .eq("id", row.id);

    await mergeDuplicateConversations(tenantId, row.id, phone);
    if (!row.assigned_to) await ensureConversationAssignedToReception(tenantId, row.id);
    return { id: row.id, lastAfterHoursReplyAt: row.last_after_hours_reply_at };
  }

  const { data: created, error } = await supabaseAdmin
    .from("wa_conversations" as never)
    .insert({
      tenant_id: tenantId,
      patient_id: autoPatient?.id ?? null,
      contact_phone: phone,
      contact_name: autoPatient?.full_name ?? contactName ?? phone,
      contact_wa_id: fromPhone,
      assigned_to: receptionistId,
      last_message_at: timestamp.toISOString(),
      last_message_preview: preview,
      unread_count: options?.incrementUnread === false ? 0 : 1,
      status: "open",
    } as never)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const retry = await findConversationByPhoneTail(tenantId, phone);
      if (retry) {
        await supabaseAdmin
          .from("wa_conversations" as never)
          .update({
            patient_id: retry.patient_id ?? autoPatient?.id ?? null,
            contact_name: retry.contact_name ?? autoPatient?.full_name ?? contactName ?? phone,
            contact_phone: phone,
            contact_wa_id: fromPhone,
            last_message_at: timestamp.toISOString(),
            last_message_preview: preview,
            unread_count: (options?.incrementUnread ?? true) ? retry.unread_count + 1 : retry.unread_count,
            updated_at: new Date().toISOString(),
            status: "open",
          } as never)
          .eq("id", retry.id);
        await mergeDuplicateConversations(tenantId, retry.id, phone);
        return { id: retry.id, lastAfterHoursReplyAt: retry.last_after_hours_reply_at };
      }
    }
    throw new Error(error.message);
  }

  const id = (created as { id: string }).id;
  await mergeDuplicateConversations(tenantId, id, phone);
  return { id, lastAfterHoursReplyAt: null as string | null };
}

export async function maybeSendAfterHoursAutoReply(
  tenantId: string,
  conversationId: string,
  phone: string,
  lastAfterHoursReplyAt: string | null,
) {
  if (!isWhatsAppConfigured()) return;

  const [hours, customMessage] = await Promise.all([
    getBusinessHoursServer(tenantId),
    getAfterHoursMessageServer(tenantId),
  ]);

  const now = new Date();
  if (isWithinBusinessHours(hours, now)) return;
  if (!shouldSendAfterHoursReply(lastAfterHoursReplyAt, now)) return;

  const message = customMessage?.trim() || DEFAULT_AFTER_HOURS_MESSAGE;
  try {
    const normalized = normalizeBrazilPhone(phone);
    const { messageId } = await providerSendText(normalized, message);
    const ts = now.toISOString();

    await supabaseAdmin.from("wa_messages" as never).insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "text",
      body: message,
      status: "sent",
      sent_by: null,
      created_at: ts,
    } as never);

    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        last_after_hours_reply_at: ts,
        last_message_at: ts,
        last_message_preview: message.slice(0, 120),
        updated_at: ts,
      } as never)
      .eq("id", conversationId);

    await logWaAudit({
      tenantId,
      conversationId,
      action: "after_hours_auto_reply",
      details: { preview: message.slice(0, 80) },
    });
  } catch (e) {
    console.error("[CRM] after-hours auto-reply failed:", e);
  }
}

export async function trackStaffFirstResponse(conversationId: string) {
  const { data } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("first_response_at")
    .eq("id", conversationId)
    .maybeSingle();
  if ((data as { first_response_at?: string | null } | null)?.first_response_at) return;

  await supabaseAdmin
    .from("wa_conversations" as never)
    .update({ first_response_at: new Date().toISOString() } as never)
    .eq("id", conversationId);
}

export async function messageExists(waMessageId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("wa_messages" as never)
    .select("id")
    .eq("wa_message_id", waMessageId)
    .maybeSingle();
  return !!data;
}

export async function insertWaMessage(input: {
  tenantId: string;
  conversationId: string;
  waMessageId: string;
  direction: "inbound" | "outbound";
  messageType: string;
  body: string;
  mediaId?: string | null;
  mediaMime?: string | null;
  mediaFilename?: string | null;
  status?: string;
  sentBy?: string | null;
  sentAt?: Date;
  rawPayload?: unknown;
}) {
  if (await messageExists(input.waMessageId)) return false;

  const sentAt = (input.sentAt ?? new Date()).toISOString();

  const { error } = await supabaseAdmin.from("wa_messages" as never).insert({
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    wa_message_id: input.waMessageId,
    direction: input.direction,
    message_type: input.messageType,
    body: input.body,
    media_id: input.mediaId ?? null,
    media_mime: input.mediaMime ?? null,
    media_filename: input.mediaFilename ?? null,
    status: input.status ?? (input.direction === "inbound" ? "delivered" : "sent"),
    sent_by: input.sentBy ?? null,
    created_at: sentAt,
    raw_payload: input.rawPayload as never,
  } as never);

  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);

  if (input.direction === "inbound") {
    const { data: conv } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("channel, pipeline_stage_id")
      .eq("id", input.conversationId)
      .maybeSingle();
    const convRow = conv as { channel?: string; pipeline_stage_id?: string | null } | null;
    const firstInbound = await isFirstInboundMessage(input.conversationId);
    void applyWaTagRules({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      channel: convRow?.channel ?? "whatsapp",
      messageBody: input.body,
      isFirstInbound: firstInbound,
      pipelineStageId: convRow?.pipeline_stage_id,
    }).catch((e) => console.error("[CRM] tag rules error:", e));

    const { data: convMeta } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("contact_name")
      .eq("id", input.conversationId)
      .maybeSingle();

    void onInboundMessageForFollowUp({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      patientName: (convMeta as { contact_name?: string | null } | null)?.contact_name,
      isFirstInbound: firstInbound,
    }).catch((e) => console.error("[CRM] follow-up inbound error:", e));
  }

  return true;
}

export async function updateMessageStatus(waMessageId: string, status: string, errorMessage?: string) {
  const mapped =
    status === "sent" || status === "SENT"
      ? "sent"
      : status === "delivered" || status === "RECEIVED"
        ? "delivered"
        : status === "read" || status === "READ" || status === "PLAYED"
          ? "read"
          : status === "failed" || status === "FAILED"
            ? "failed"
            : null;
  if (!mapped) return;

  await supabaseAdmin
    .from("wa_messages" as never)
    .update({
      status: mapped,
      error_message: errorMessage ?? null,
    } as never)
    .eq("wa_message_id", waMessageId);
}

/** Garante que todos os chats ativos da Z-API existam no CRM (última mensagem conhecida). */
function zapiChatPreview(chat: {
  lastMessageText?: string;
  lastMessage?: string;
  message?: string;
}): string {
  const text = chat.lastMessageText ?? chat.lastMessage ?? chat.message;
  if (typeof text === "string" && text.trim()) return text.trim().slice(0, 120);
  return "Aguardando mensagens (webhook)";
}

export async function syncZApiChatsToCrm(tenantId: string, chats: {
  phone: string;
  name?: string;
  lastMessageTime?: string | number;
  lastMessageText?: string;
  lastMessage?: string;
  message?: string;
  messagesUnread?: number | string;
  isGroup?: boolean;
}[]) {
  let synced = 0;
  for (const chat of chats) {
    if (chat.isGroup) continue;
    if (!chat.phone?.trim()) continue;

    const phone = normalizeBrazilPhone(chat.phone);
    if (!phone) continue;

    const tsRaw = chat.lastMessageTime;
    const ts = tsRaw
      ? new Date(typeof tsRaw === "string" ? Number(tsRaw) * (tsRaw.length <= 10 ? 1000 : 1) : tsRaw)
      : new Date();
    const preview = zapiChatPreview(chat);
    const unread = Number(chat.messagesUnread ?? 0);

    const conv = await upsertConversation(tenantId, phone, chat.name ?? null, preview, ts, {
      incrementUnread: false,
    });

    const updates: Record<string, unknown> = {};
    if (unread > 0) updates.unread_count = unread;
    updates.channel = "whatsapp";

    if (Object.keys(updates).length) {
      await supabaseAdmin
        .from("wa_conversations" as never)
        .update(updates as never)
        .eq("id", conv.id);
    }
    synced++;
  }

  await assignOpenConversationsToReception(tenantId, { onlyUnassigned: true });
  return synced;
}

export type SocialChannel = "instagram" | "messenger";

export async function upsertSocialConversation(
  tenantId: string,
  channel: SocialChannel,
  externalUserId: string,
  contactName: string | null,
  preview: string,
  timestamp: Date,
) {
  const receptionistId = await getDefaultReceptionAssignee(tenantId);
  const { data: existing } = await supabaseAdmin
    .from("wa_conversations" as never)
    .select("id, unread_count, status, contact_name")
    .eq("tenant_id", tenantId)
    .eq("channel", channel)
    .eq("external_user_id", externalUserId)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; unread_count: number; status: string; contact_name: string | null };
    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        contact_name: contactName ?? row.contact_name,
        contact_phone: externalUserId,
        last_message_at: timestamp.toISOString(),
        last_message_preview: preview,
        unread_count: row.unread_count + 1,
        updated_at: new Date().toISOString(),
        status: "open",
        ...(row.assigned_to || !receptionistId ? {} : { assigned_to: receptionistId }),
      } as never)
      .eq("id", row.id);
    return { id: row.id };
  }

  const { data: created, error } = await supabaseAdmin
    .from("wa_conversations" as never)
    .insert({
      tenant_id: tenantId,
      channel,
      external_user_id: externalUserId,
      contact_phone: externalUserId,
      contact_name: contactName ?? externalUserId,
      assigned_to: receptionistId,
      last_message_at: timestamp.toISOString(),
      last_message_preview: preview,
      unread_count: 1,
      status: "open",
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: (created as { id: string }).id };
}
