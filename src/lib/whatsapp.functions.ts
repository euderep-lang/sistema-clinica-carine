import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { convertAudioBase64ToWhatsAppOgg } from "@/lib/wa-audio-convert.server";
import { findConversationByPhone, normalizeBrazilPhone } from "@/lib/wa-phone";
import { onOutboundMessageForFollowUp } from "@/lib/wa-follow-up.server";
import {
  getWhatsAppProvider,
  getWhatsAppStatusPayload,
  isWhatsAppConfigured,
  providerDeleteMessage,
  providerForwardMessage,
  providerResolveMediaUrl,
  providerSendContact,
  providerSendLocation,
  providerSendMedia,
  providerSendText,
} from "@/lib/whatsapp-provider.server";
import { extractWaContact, extractWaLocation } from "@/lib/wa-message-content";
import { sendMetaSocialText } from "@/lib/whatsapp-meta.server";
import { geocodeAddressLine } from "@/lib/wa-geocode.server";
import { formatClinicAddress, type ClinicAddress } from "@/lib/settings-helpers";
import { getTenantSettingServer } from "@/lib/wa-tenant-settings.server";
import { normalizeOutboundMessageBody } from "@/lib/wa-automation-quick-replies.server";
import { normalizeManualOutboundMessage } from "@/lib/wa-quick-reply-ai.server";
import {
  formatStaffWaTextForPatient,
  loadWaSenderProfile,
} from "@/lib/wa-sender-signature.server";
import { getProfessionalWaUnreadBadgeCount, sendPushToUsers } from "@/lib/web-push.server";
import { logAuditSafe } from "@/lib/audit.server";

type CrmRole = "admin" | "professional" | "receptionist";

async function requireCrmAccess(supabase: Awaited<ReturnType<typeof import("@supabase/supabase-js").createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Perfil não encontrado");
  if (!["admin", "professional", "receptionist"].includes(profile.role)) {
    throw new Error("Sem permissão para o CRM");
  }
  return profile as { role: CrmRole; tenant_id: string };
}

function configError() {
  const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase();
  if (provider === "zapi" || process.env.ZAPI_INSTANCE_ID) {
    return "WhatsApp não configurado. Defina ZAPI_INSTANCE_ID e ZAPI_TOKEN no .env";
  }
  return "WhatsApp não configurado. Defina WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no .env";
}

type ForwardMessageRow = {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  message_type: string;
  body: string | null;
  media_id: string | null;
  media_mime: string | null;
  media_filename: string | null;
  deleted_at: string | null;
  raw_payload: unknown;
};

function forwardPreview(type: string, body: string | null, filename?: string | null): string {
  const t = body?.trim();
  if (type === "text" && t) return t.slice(0, 120);
  if (type === "audio") return "🎤 Áudio";
  if (type === "image" || type === "sticker") return t && !/^📷/i.test(t) ? `📷 ${t.slice(0, 100)}` : "📷 Imagem";
  if (type === "video") return t && !/^🎬/i.test(t) ? `🎬 ${t.slice(0, 100)}` : "🎬 Vídeo";
  if (type === "document") return `📎 ${filename ?? t ?? "Documento"}`;
  if (type === "contact") return t ?? "👤 Contato";
  if (type === "location") return t ?? "📍 Localização";
  return t?.slice(0, 120) ?? "Mensagem";
}

function isForwardMediaPlaceholder(body: string | null | undefined, type: string): boolean {
  const t = body?.trim() ?? "";
  if (!t) return true;
  if (type === "audio") return /^(🎤\s*)?Áudio$/i.test(t);
  if (type === "image" || type === "sticker") return /^📷/.test(t) || t === "Imagem";
  if (type === "video") return /^🎬/.test(t) || t === "Vídeo";
  if (type === "document") return /^📎/.test(t);
  return false;
}

async function mediaRefToBase64(
  mediaRef: string,
  mimeType: string,
  filename: string,
): Promise<{ base64: string; mimeType: string; filename: string }> {
  if (mediaRef.startsWith("data:")) {
    const match = mediaRef.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match?.[2]) throw new Error("Mídia inválida");
    return { base64: match[2], mimeType: match[1] || mimeType, filename };
  }
  if (mediaRef.startsWith("http://") || mediaRef.startsWith("https://")) {
    const res = await fetch(mediaRef);
    if (!res.ok) throw new Error("Não foi possível baixar a mídia para encaminhar");
    const buf = Buffer.from(await res.arrayBuffer());
    const resolvedMime = res.headers.get("content-type")?.split(";")[0]?.trim() || mimeType;
    return { base64: buf.toString("base64"), mimeType: resolvedMime, filename };
  }
  throw new Error("Mídia indisponível para encaminhar");
}

async function resendMessageForForward(message: ForwardMessageRow, destPhone: string): Promise<string> {
  const type = message.message_type;

  if (type === "text") {
    const text = message.body?.trim();
    if (!text) throw new Error("Mensagem sem texto para encaminhar");
    const { messageId } = await providerSendText(destPhone, text);
    return messageId;
  }

  if (type === "contact") {
    const contact = extractWaContact({
      message_type: type,
      body: message.body,
      raw_payload: message.raw_payload,
    });
    if (!contact?.phone) throw new Error("Contato sem telefone para encaminhar");
    const { messageId } = await providerSendContact(destPhone, contact.name, contact.phone);
    return messageId;
  }

  if (type === "location") {
    const location = extractWaLocation({
      message_type: type,
      body: message.body,
      raw_payload: message.raw_payload,
    });
    if (!location) throw new Error("Localização indisponível para encaminhar");
    const { messageId } = await providerSendLocation(
      destPhone,
      location.title,
      location.address ?? "",
      location.latitude,
      location.longitude,
    );
    return messageId;
  }

  const mediaType =
    type === "sticker" ? "image" : type === "image" || type === "audio" || type === "video" || type === "document"
      ? type
      : null;
  if (!mediaType) throw new Error(`Tipo de mensagem não suportado: ${type}`);
  if (!message.media_id) throw new Error("Mídia indisponível para encaminhar");

  let { base64, mimeType, filename } = await mediaRefToBase64(
    message.media_id,
    message.media_mime ?? "application/octet-stream",
    message.media_filename ?? "arquivo",
  );

  if (mediaType === "audio" && !/audio\/ogg|application\/ogg/i.test(mimeType)) {
    const converted = await convertAudioBase64ToWhatsAppOgg(base64, mimeType);
    if (converted) {
      base64 = converted.base64;
      mimeType = converted.mimeType;
      filename = converted.filename;
    }
  }

  const caption =
    message.body?.trim() && !isForwardMediaPlaceholder(message.body, type)
      ? message.body.trim()
      : undefined;

  const { messageId } = await providerSendMedia(
    destPhone,
    mediaType,
    base64,
    mimeType,
    filename,
    caption,
  );
  return messageId;
}

export const getWhatsAppStatus = createServerFn({ method: "GET" }).handler(async () => getWhatsAppStatusPayload());

export const sendWaText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string; text: string; replyToMessageId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    const { data: conv, error } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone, first_response_at, status, channel, external_user_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error || !conv) throw new Error("Conversa não encontrada");

    const convRow = conv as {
      id: string;
      contact_phone: string;
      first_response_at: string | null;
      status: string;
      channel?: string;
      external_user_id?: string | null;
    };

    const text = await normalizeManualOutboundMessage(
      profile.tenant_id,
      normalizeOutboundMessageBody(data.text),
      { conversationId: data.conversationId },
    );
    if (!text) throw new Error("Mensagem vazia");

    const senderProfile = await loadWaSenderProfile(supabase, userId);
    const patientText = formatStaffWaTextForPatient(text, senderProfile);

    let replyToWaId: string | undefined;
    if (data.replyToMessageId) {
      const { data: replyMsg } = await supabase
        .from("wa_messages" as never)
        .select("wa_message_id")
        .eq("id", data.replyToMessageId)
        .eq("conversation_id", data.conversationId)
        .maybeSingle();
      replyToWaId = (replyMsg as { wa_message_id?: string } | null)?.wa_message_id;
    }

    const channel = convRow.channel ?? "whatsapp";
    let messageId: string;

    if (channel === "instagram" || channel === "messenger") {
      const recipientId = convRow.external_user_id ?? convRow.contact_phone;
      const result = await sendMetaSocialText(recipientId, patientText, channel);
      messageId = result.messageId;
    } else {
      const phone = normalizeBrazilPhone(convRow.contact_phone);
      const result = await providerSendText(phone, patientText, {
        replyToWaMessageId: replyToWaId,
      });
      messageId = result.messageId;
    }

    const now = new Date().toISOString();
    await supabase.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "text",
      body: text,
      status: "sent",
      sent_by: userId,
      reply_to_message_id: data.replyToMessageId ?? null,
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

    await supabase
      .from("wa_conversations" as never)
      .update(convUpdate as never)
      .eq("id", data.conversationId);

    void onOutboundMessageForFollowUp({
      tenantId: profile.tenant_id,
      conversationId: data.conversationId,
      text,
      userId,
    }).catch((e) => console.error("[CRM] follow-up outbound error:", e));

    logAuditSafe({
      tenantId: profile.tenant_id,
      actorId: userId,
      category: "whatsapp",
      action: "whatsapp.message_sent",
      summary: `Mensagem WhatsApp enviada: ${text.slice(0, 100)}`,
      entityType: "conversation",
      entityId: data.conversationId,
      conversationId: data.conversationId,
      details: { channel, message_id: messageId, preview: text.slice(0, 200) },
      source: "ui",
    });

    return { ok: true };
  });

export const sendWaMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string; base64: string; mimeType: string; filename: string; mediaType: "image" | "audio" | "video" | "document"; caption?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    const { data: conv, error } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error || !conv) throw new Error("Conversa não encontrada");

    const phone = normalizeBrazilPhone((conv as { contact_phone: string }).contact_phone);

    let base64 = data.base64;
    let mimeType = data.mimeType;
    let filename = data.filename;

    // WhatsApp exige OGG Opus para nota de voz; converte tudo que não for OGG
    // (inclui webm;codecs=opus do Chrome mobile, m4a do iOS, mp3 etc.)
    if (data.mediaType === "audio" && !/audio\/ogg|application\/ogg/i.test(mimeType)) {
      const converted = await convertAudioBase64ToWhatsAppOgg(base64, mimeType);
      if (converted) {
        base64 = converted.base64;
        mimeType = converted.mimeType;
        filename = converted.filename;
      } else if (/webm/i.test(mimeType)) {
        throw new Error(
          "Não foi possível converter o áudio no servidor. Tente novamente em instantes.",
        );
      }
    }

    const senderProfile = await loadWaSenderProfile(supabase, userId);
    const patientCaption = data.caption?.trim()
      ? formatStaffWaTextForPatient(data.caption, senderProfile)
      : undefined;

    const { messageId, mediaRef } = await providerSendMedia(
      phone,
      data.mediaType,
      base64,
      mimeType,
      filename,
      patientCaption,
    );

    const preview =
      data.mediaType === "audio" ? "🎤 Áudio" : data.mediaType === "image" ? "📷 Imagem" : `📎 ${filename}`;
    const now = new Date().toISOString();

    // Z-API não devolve URL da mídia — guardamos data URI para preview no CRM
    let storedMediaRef = mediaRef;
    if (!storedMediaRef) {
      const dataUri = `data:${mimeType};base64,${base64}`;
      const maxLen =
        data.mediaType === "audio" ? 1_500_000 : data.mediaType === "video" ? 900_000 : 600_000;
      if (
        (data.mediaType === "image" ||
          data.mediaType === "document" ||
          data.mediaType === "audio" ||
          data.mediaType === "video") &&
        dataUri.length <= maxLen
      ) {
        storedMediaRef = dataUri;
      }
    }

    await supabase.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: data.mediaType,
      body: data.caption ?? preview,
      media_id: storedMediaRef,
      media_mime: mimeType,
      media_filename: filename,
      status: "sent",
      sent_by: userId,
    } as never);

    await supabase
      .from("wa_conversations" as never)
      .update({
        last_message_at: now,
        last_message_preview: preview,
        updated_at: now,
      } as never)
      .eq("id", data.conversationId);

    logAuditSafe({
      tenantId: profile.tenant_id,
      actorId: userId,
      category: "whatsapp",
      action: "whatsapp.message_sent",
      summary: `Mídia WhatsApp enviada (${data.mediaType}): ${preview}`,
      entityType: "conversation",
      entityId: data.conversationId,
      conversationId: data.conversationId,
      details: { media_type: data.mediaType, message_id: messageId, filename },
      source: "ui",
    });

    return { ok: true };
  });

export const sendWaContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string; contactName: string; contactPhone: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    const contactName = data.contactName.trim();
    const contactPhone = normalizeBrazilPhone(data.contactPhone);
    if (!contactName) throw new Error("Informe o nome do contato");
    if (!contactPhone) throw new Error("Telefone do contato inválido");

    const { data: conv, error } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone, status, channel")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error || !conv) throw new Error("Conversa não encontrada");

    const convRow = conv as { contact_phone: string; status: string; channel?: string };
    if ((convRow.channel ?? "whatsapp") !== "whatsapp") {
      throw new Error("Compartilhar contato só funciona no WhatsApp");
    }

    const phone = normalizeBrazilPhone(convRow.contact_phone);
    const { messageId } = await providerSendContact(phone, contactName, contactPhone);

    const now = new Date().toISOString();
    const preview = `👤 Contato: ${contactName}`;
    const rawPayload = {
      contact: { displayName: contactName, contactPhone },
    };

    await supabase.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "contact",
      body: preview,
      status: "sent",
      sent_by: userId,
      raw_payload: rawPayload,
    } as never);

    await supabase
      .from("wa_conversations" as never)
      .update({
        last_message_at: now,
        last_message_preview: preview,
        updated_at: now,
        ...(convRow.status === "closed" ? { status: "open", close_reason: null, closed_at: null, closed_by: null } : {}),
      } as never)
      .eq("id", data.conversationId);

    return { ok: true };
  });

export const sendWaClinicLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    const { data: conv, error } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone, status, channel")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (error || !conv) throw new Error("Conversa não encontrada");

    const convRow = conv as { contact_phone: string; status: string; channel?: string };
    if ((convRow.channel ?? "whatsapp") !== "whatsapp") {
      throw new Error("Compartilhar localização só funciona no WhatsApp");
    }

    const [{ data: tenantRow }, addrSetting] = await Promise.all([
      supabase.from("tenants").select("name, trade_name").eq("id", profile.tenant_id).maybeSingle(),
      getTenantSettingServer<ClinicAddress>(profile.tenant_id, "address"),
    ]);

    const title = tenantRow?.trade_name?.trim() || tenantRow?.name?.trim() || "Clínica";
    const address = formatClinicAddress(addrSetting);
    if (!address) throw new Error("Cadastre o endereço da clínica em Configurações → Clínica");

    const coords = await geocodeAddressLine(address);
    if (!coords) throw new Error("Não foi possível localizar o endereço da clínica no mapa");

    const phone = normalizeBrazilPhone(convRow.contact_phone);
    const { messageId } = await providerSendLocation(phone, title, address, coords.lat, coords.lng);

    const now = new Date().toISOString();
    const preview = `📍 ${title}`;
    const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    const rawPayload = {
      location: {
        name: title,
        address,
        latitude: coords.lat,
        longitude: coords.lng,
        url: mapsUrl,
      },
    };

    await supabase.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "location",
      body: `${preview}\n${mapsUrl}`,
      status: "sent",
      sent_by: userId,
      raw_payload: rawPayload,
    } as never);

    await supabase
      .from("wa_conversations" as never)
      .update({
        last_message_at: now,
        last_message_preview: preview,
        updated_at: now,
        ...(convRow.status === "closed" ? { status: "open", close_reason: null, closed_at: null, closed_by: null } : {}),
      } as never)
      .eq("id", data.conversationId);

    return { ok: true };
  });

export const transferWaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string; toUserId: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);

    const { data: conv } = await supabase
      .from("wa_conversations" as never)
      .select("unread_count, contact_name, contact_phone")
      .eq("id", data.conversationId)
      .maybeSingle();

    const convRow = conv as
      | { unread_count?: number; contact_name?: string | null; contact_phone?: string | null }
      | null;
    const unread = convRow?.unread_count ?? 0;

    await supabase
      .from("wa_conversations" as never)
      .update({
        assigned_to: data.toUserId,
        unread_count: unread > 0 ? unread : 1,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.conversationId);

    await supabase.from("wa_transfers" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.conversationId,
      from_user_id: userId,
      to_user_id: data.toUserId,
      note: data.note ?? null,
    } as never);

    // Web Push 24/7: quem recebe a transferência é notificado (inclusive profissional).
    try {
      const name = convRow?.contact_name?.trim() || convRow?.contact_phone || "Conversa";
      const unreadCount = await getProfessionalWaUnreadBadgeCount(profile.tenant_id, data.toUserId);
      await sendPushToUsers([data.toUserId], {
        title: `WhatsApp · ${name}`,
        body: data.note?.trim()
          ? `Conversa transferida para você · ${data.note.trim()}`
          : "Conversa transferida para você",
        conversationId: data.conversationId,
        tag: `wa-${data.conversationId}`,
        url: `/crm/inbox?conversation=${data.conversationId}`,
        unreadCount,
      });
    } catch (e) {
      console.error("[transferWaConversation] push falhou:", e);
    }

    return { ok: true };
  });

export const markWaConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("wa_conversations" as never)
      .update({ unread_count: 0 } as never)
      .eq("id", data.conversationId);

    await supabase
      .from("wa_transfers" as never)
      .update({ seen_at: new Date().toISOString() } as never)
      .eq("conversation_id", data.conversationId)
      .eq("to_user_id", userId)
      .is("seen_at", null);

    return { ok: true };
  });

export const scheduleWaMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string; body: string; sendAt: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);

    const body = data.body.trim();
    if (!body) throw new Error("Mensagem vazia");

    const when = new Date(data.sendAt);
    if (Number.isNaN(when.getTime())) throw new Error("Data inválida");
    if (when.getTime() < Date.now() + 30_000) {
      throw new Error("Escolha um horário no futuro (pelo menos 1 minuto à frente)");
    }

    const { data: conv } = await supabase
      .from("wa_conversations" as never)
      .select("id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa não encontrada");

    const { data: created, error } = await supabase
      .from("wa_scheduled_messages" as never)
      .insert({
        tenant_id: profile.tenant_id,
        conversation_id: data.conversationId,
        body,
        send_at: when.toISOString(),
        created_by: userId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: (created as { id: string }).id };
  });

export const listScheduledWaMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("wa_scheduled_messages" as never)
      .select("id, body, send_at, status, created_at, error")
      .eq("conversation_id", data.conversationId)
      .eq("status", "pending")
      .order("send_at", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as { id: string; body: string; send_at: string; status: string; created_at: string; error: string | null }[];
  });

export const cancelScheduledWaMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("wa_scheduled_messages" as never)
      .update({ status: "canceled" } as never)
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markWaConversationUnread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireCrmAccess(supabase, userId);

    const { data: conv } = await supabase
      .from("wa_conversations" as never)
      .select("unread_count")
      .eq("id", data.conversationId)
      .maybeSingle();
    const current = (conv as { unread_count?: number } | null)?.unread_count ?? 0;

    await supabase
      .from("wa_conversations" as never)
      .update({ unread_count: current > 0 ? current : 1 } as never)
      .eq("id", data.conversationId);

    return { ok: true };
  });

export const deleteWaMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { messageId: string; scope: "everyone" | "me" }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    const scope = data.scope === "everyone" ? "everyone" : "me";

    const { data: msg } = await supabase
      .from("wa_messages" as never)
      .select("id, conversation_id, wa_message_id, direction, deleted_at, created_at")
      .eq("id", data.messageId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (!msg) throw new Error("Mensagem não encontrada");

    const message = msg as {
      id: string;
      conversation_id: string;
      wa_message_id: string | null;
      direction: "inbound" | "outbound";
      deleted_at: string | null;
      created_at: string;
    };
    if (message.deleted_at) return { ok: true };

    if (scope === "everyone") {
      if (!isWhatsAppConfigured()) throw new Error(configError());
      if (!message.wa_message_id) {
        throw new Error("Mensagem sem ID do WhatsApp — só é possível apagar para você.");
      }

      const { data: conv } = await supabase
        .from("wa_conversations" as never)
        .select("contact_phone, channel")
        .eq("id", message.conversation_id)
        .maybeSingle();
      const convRow = conv as { contact_phone: string; channel?: string } | null;
      if (!convRow) throw new Error("Conversa não encontrada");
      if ((convRow.channel ?? "whatsapp") !== "whatsapp") {
        throw new Error("Apagar para todos só funciona no WhatsApp");
      }

      const phone = normalizeBrazilPhone(convRow.contact_phone);
      try {
        await providerDeleteMessage(phone, message.wa_message_id, message.direction === "outbound");
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Falha ao apagar no WhatsApp";
        throw new Error(
          `Não foi possível apagar para todos: ${reason}. O WhatsApp só permite apagar para todos por um tempo limitado após o envio.`,
        );
      }
    }

    const now = new Date().toISOString();
    await supabase
      .from("wa_messages" as never)
      .update({ deleted_at: now, deleted_by: userId, deleted_scope: scope } as never)
      .eq("id", message.id);

    // Se era a última mensagem da conversa, atualiza a prévia da lista.
    const { data: latest } = await supabase
      .from("wa_messages" as never)
      .select("id")
      .eq("conversation_id", message.conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if ((latest as { id: string } | null)?.id === message.id) {
      await supabase
        .from("wa_conversations" as never)
        .update({ last_message_preview: "🚫 Mensagem apagada", updated_at: now } as never)
        .eq("id", message.conversation_id);
    }

    logAuditSafe({
      tenantId: profile.tenant_id,
      actorId: userId,
      category: "whatsapp",
      action: "whatsapp.message_deleted",
      summary: scope === "everyone" ? "Mensagem WhatsApp apagada para todos" : "Mensagem WhatsApp apagada no CRM",
      entityType: "conversation",
      entityId: message.conversation_id,
      conversationId: message.conversation_id,
      details: { message_id: message.wa_message_id, scope },
      source: "ui",
    });

    return { ok: true };
  });

export const forwardWaMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { messageId: string; targetConversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    const { data: msg } = await supabase
      .from("wa_messages" as never)
      .select(
        "id, conversation_id, wa_message_id, message_type, body, media_id, media_mime, media_filename, deleted_at, raw_payload",
      )
      .eq("id", data.messageId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (!msg) throw new Error("Mensagem não encontrada");

    const message = msg as ForwardMessageRow;
    if (message.deleted_at) throw new Error("Não é possível encaminhar uma mensagem apagada");
    if (message.message_type === "reaction") {
      throw new Error("Não é possível encaminhar reações");
    }
    if (message.conversation_id === data.targetConversationId) {
      throw new Error("Selecione outra conversa para encaminhar");
    }

    const { data: sourceConv } = await supabase
      .from("wa_conversations" as never)
      .select("contact_phone, channel")
      .eq("id", message.conversation_id)
      .maybeSingle();
    const { data: targetConv } = await supabase
      .from("wa_conversations" as never)
      .select("id, contact_phone, channel, status, first_response_at")
      .eq("id", data.targetConversationId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    const sourceRow = sourceConv as { contact_phone: string; channel?: string } | null;
    const targetRow = targetConv as {
      id: string;
      contact_phone: string;
      channel?: string;
      status: string;
      first_response_at: string | null;
    } | null;
    if (!sourceRow || !targetRow) throw new Error("Conversa não encontrada");
    if ((sourceRow.channel ?? "whatsapp") !== "whatsapp" || (targetRow.channel ?? "whatsapp") !== "whatsapp") {
      throw new Error("Encaminhar só funciona em conversas do WhatsApp");
    }

    const sourcePhone = normalizeBrazilPhone(sourceRow.contact_phone);
    const destPhone = normalizeBrazilPhone(targetRow.contact_phone);

    let newWaMessageId: string;
    let usedNativeForward = false;

    if (message.wa_message_id && getWhatsAppProvider() === "zapi") {
      try {
        const result = await providerForwardMessage(destPhone, message.wa_message_id, sourcePhone);
        newWaMessageId = result.messageId;
        usedNativeForward = true;
      } catch {
        newWaMessageId = await resendMessageForForward(message, destPhone);
      }
    } else {
      newWaMessageId = await resendMessageForForward(message, destPhone);
    }

    const preview = forwardPreview(message.message_type, message.body, message.media_filename);
    const now = new Date().toISOString();

    let storedMediaRef = message.media_id;
    if (
      storedMediaRef &&
      !storedMediaRef.startsWith("http") &&
      !storedMediaRef.startsWith("data:") &&
      usedNativeForward
    ) {
      storedMediaRef = null;
    }

    await supabase.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: data.targetConversationId,
      wa_message_id: newWaMessageId,
      direction: "outbound",
      message_type: message.message_type === "sticker" ? "image" : message.message_type,
      body: message.body,
      media_id: storedMediaRef,
      media_mime: message.media_mime,
      media_filename: message.media_filename,
      status: "sent",
      sent_by: userId,
    } as never);

    const convUpdate: Record<string, unknown> = {
      last_message_at: now,
      last_message_preview: preview.slice(0, 120),
      updated_at: now,
    };
    if (!targetRow.first_response_at) convUpdate.first_response_at = now;
    if (targetRow.status === "closed") {
      convUpdate.status = "open";
      convUpdate.close_reason = null;
      convUpdate.closed_at = null;
      convUpdate.closed_by = null;
    }

    await supabase
      .from("wa_conversations" as never)
      .update(convUpdate as never)
      .eq("id", data.targetConversationId);

    logAuditSafe({
      tenantId: profile.tenant_id,
      actorId: userId,
      category: "whatsapp",
      action: "whatsapp.message_forwarded",
      summary: `Mensagem encaminhada: ${preview.slice(0, 80)}`,
      entityType: "conversation",
      entityId: data.targetConversationId,
      conversationId: data.targetConversationId,
      details: {
        source_message_id: message.id,
        source_conversation_id: message.conversation_id,
        native_forward: usedNativeForward,
      },
      source: "ui",
    });

    return { ok: true, targetConversationId: data.targetConversationId };
  });

export const fetchWaMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { mediaId: string; mimeType?: string }) => d)
  .handler(async ({ data, context }) => {
    await requireCrmAccess(context.supabase, context.userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());
    return providerResolveMediaUrl(data.mediaId, data.mimeType ?? null);
  });

export const startWaConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { phone: string; patientId?: string; name?: string; text: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    if (data.patientId) {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("id", data.patientId)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (!patient) throw new Error("Paciente não encontrado");
    }

    const phone = normalizeBrazilPhone(data.phone);
    const now = new Date().toISOString();
    const displayName = data.name ?? phone;
    const draft = normalizeOutboundMessageBody(data.text);
    if (!draft) throw new Error("Mensagem vazia");

    const senderProfile = await loadWaSenderProfile(supabase, userId);

    const { data: tenantConvs } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("id, contact_phone, contact_name, patient_id, last_message_at, created_at")
      .eq("tenant_id", profile.tenant_id);

    const existing = findConversationByPhone(
      (tenantConvs ?? []) as {
        id: string;
        contact_phone: string;
        contact_name: string | null;
        patient_id: string | null;
        last_message_at: string | null;
        created_at: string;
      }[],
      phone,
    );

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
      const { error: updateErr } = await supabaseAdmin
        .from("wa_conversations" as never)
        .update({
          contact_phone: phone,
          patient_id: data.patientId ?? existing.patient_id ?? null,
          contact_name: data.patientId ? displayName : existing.contact_name ?? displayName,
          assigned_to: userId,
          status: "open",
          updated_at: now,
        } as never)
        .eq("id", existing.id);
      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { data: conv, error: insertErr } = await supabaseAdmin
        .from("wa_conversations" as never)
        .insert({
          tenant_id: profile.tenant_id,
          contact_phone: phone,
          patient_id: data.patientId ?? null,
          contact_name: displayName,
          assigned_to: userId,
          status: "open",
          updated_at: now,
        } as never)
        .select("id")
        .single();
      if (insertErr || !conv) throw new Error(insertErr?.message ?? "Falha ao criar conversa");
      conversationId = (conv as { id: string }).id;
    }

    const text = await normalizeManualOutboundMessage(profile.tenant_id, draft, {
      conversationId,
      contactName: displayName,
    });
    const patientText = formatStaffWaTextForPatient(text, senderProfile);

    const { messageId } = await providerSendText(phone, patientText);

    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        last_message_at: now,
        last_message_preview: text.slice(0, 120),
        updated_at: now,
      } as never)
      .eq("id", conversationId);

    await supabaseAdmin.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "text",
      body: text,
      status: "sent",
      sent_by: userId,
    } as never);

    return { conversationId };
  });

export const sendPrescriptionViaCrm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { prescriptionId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const profile = await requireCrmAccess(supabase, userId);
    if (!isWhatsAppConfigured()) throw new Error(configError());

    const { data: rx, error: rxErr } = await supabase
      .from("prescriptions" as never)
      .select("id, tenant_id, patient_id, professional_id, pdf_url, signed_at, date, status")
      .eq("id", data.prescriptionId)
      .maybeSingle();
    if (rxErr || !rx) throw new Error("Receita não encontrada");

    const rxRow = rx as {
      id: string;
      tenant_id: string;
      patient_id: string;
      professional_id: string;
      pdf_url: string | null;
      signed_at: string | null;
      date: string;
      status: string;
    };

    if (rxRow.tenant_id !== profile.tenant_id) throw new Error("Sem permissão");
    if (profile.role === "professional" && rxRow.professional_id !== userId) {
      throw new Error("Sem permissão para enviar esta receita");
    }
    if (rxRow.status !== "finalized") throw new Error("Receita ainda não finalizada");
    if (!rxRow.pdf_url) throw new Error("PDF da receita não disponível");
    if (!rxRow.signed_at) throw new Error("Receita não assinada digitalmente");

    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select("id, full_name, phone")
      .eq("id", rxRow.patient_id)
      .maybeSingle();
    if (patErr || !patient) throw new Error("Paciente não encontrado");
    if (!patient.phone) throw new Error("Paciente sem telefone cadastrado");

    const phone = normalizeBrazilPhone(patient.phone);
    if (!phone) throw new Error("Telefone do paciente inválido");

    const { data: pdfBlob, error: dlErr } = await supabaseAdmin.storage
      .from("prescriptions")
      .download(rxRow.pdf_url);
    if (dlErr || !pdfBlob) throw new Error("Erro ao carregar PDF da receita");

    const bytes = Buffer.from(await pdfBlob.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) {
      throw new Error("PDF muito grande para envio (máx. 5 MB)");
    }
    const base64 = bytes.toString("base64");
    const dateSlug = (rxRow.date ?? "receita").replace(/-/g, "");
    const filename = `receita_${dateSlug}.pdf`;

    const now = new Date().toISOString();
    const displayName = patient.full_name?.trim() || phone;

    const { data: tenantConvs } = await supabaseAdmin
      .from("wa_conversations" as never)
      .select("id, contact_phone, contact_name, patient_id, last_message_at, created_at")
      .eq("tenant_id", profile.tenant_id);

    const existing = findConversationByPhone(
      (tenantConvs ?? []) as {
        id: string;
        contact_phone: string;
        contact_name: string | null;
        patient_id: string | null;
        last_message_at: string | null;
        created_at: string;
      }[],
      phone,
    );

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
      const { error: updateErr } = await supabaseAdmin
        .from("wa_conversations" as never)
        .update({
          contact_phone: phone,
          patient_id: rxRow.patient_id,
          contact_name: displayName,
          assigned_to: userId,
          status: "open",
          close_reason: null,
          closed_at: null,
          closed_by: null,
          updated_at: now,
        } as never)
        .eq("id", existing.id);
      if (updateErr) throw new Error(updateErr.message);
    } else {
      const { data: conv, error: insertErr } = await supabaseAdmin
        .from("wa_conversations" as never)
        .insert({
          tenant_id: profile.tenant_id,
          contact_phone: phone,
          patient_id: rxRow.patient_id,
          contact_name: displayName,
          assigned_to: userId,
          status: "open",
          updated_at: now,
        } as never)
        .select("id")
        .single();
      if (insertErr || !conv) throw new Error(insertErr?.message ?? "Falha ao criar conversa");
      conversationId = (conv as { id: string }).id;
    }

    const senderProfile = await loadWaSenderProfile(supabase, userId);
    const captionDraft = await normalizeManualOutboundMessage(profile.tenant_id, "Segue sua receita médica.", {
      conversationId,
      contactName: displayName,
    });
    const caption = formatStaffWaTextForPatient(captionDraft, senderProfile);

    const { messageId, mediaRef } = await providerSendMedia(
      phone,
      "document",
      base64,
      "application/pdf",
      filename,
      caption,
    );

    const preview = `📎 ${filename}`;
    let storedMediaRef = mediaRef;
    if (!storedMediaRef) {
      const dataUri = `data:application/pdf;base64,${base64}`;
      if (dataUri.length <= 600_000) storedMediaRef = dataUri;
    }

    await supabaseAdmin.from("wa_messages" as never).insert({
      tenant_id: profile.tenant_id,
      conversation_id: conversationId,
      wa_message_id: messageId,
      direction: "outbound",
      message_type: "document",
      body: caption,
      media_id: storedMediaRef,
      media_mime: "application/pdf",
      media_filename: filename,
      status: "sent",
      sent_by: userId,
    } as never);

    await supabaseAdmin
      .from("wa_conversations" as never)
      .update({
        last_message_at: now,
        last_message_preview: preview,
        updated_at: now,
      } as never)
      .eq("id", conversationId);

    void onOutboundMessageForFollowUp({
      tenantId: profile.tenant_id,
      conversationId,
      text: caption,
      userId,
    }).catch((e) => console.error("[CRM] follow-up outbound error:", e));

    logAuditSafe({
      tenantId: profile.tenant_id,
      actorId: userId,
      category: "whatsapp",
      action: "whatsapp.prescription_sent",
      summary: `Receita enviada pelo CRM: ${filename}`,
      entityType: "prescription",
      entityId: rxRow.id,
      conversationId,
      details: { prescription_id: rxRow.id, patient_id: rxRow.patient_id, filename },
      source: "ui",
    });

    return { ok: true as const, conversationId };
  });
