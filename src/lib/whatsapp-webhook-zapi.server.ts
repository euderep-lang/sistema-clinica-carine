import {
  insertWaMessage,
  maybeSendAfterHoursAutoReply,
  resolveTenantId,
  trackStaffFirstResponse,
  updateMessageStatus,
  upsertConversation,
} from "@/lib/whatsapp-crm-storage.server";
import { getZApiConfig } from "@/lib/whatsapp-zapi.server";

interface ZApiReceivedPayload {
  type?: string;
  instanceId?: string;
  phone?: string;
  messageId?: string;
  fromMe?: boolean;
  momment?: number;
  senderName?: string;
  chatName?: string;
  isGroup?: boolean;
  isNewsletter?: boolean;
  isStatusReply?: boolean;
  broadcast?: boolean;
  notification?: string;
  status?: string;
  text?: { message?: string };
  image?: { imageUrl?: string; mimeType?: string; caption?: string };
  audio?: { audioUrl?: string; mimeType?: string };
  video?: { videoUrl?: string; mimeType?: string; caption?: string };
  document?: { documentUrl?: string; mimeType?: string; fileName?: string; caption?: string };
  sticker?: { stickerUrl?: string; mimeType?: string };
}

function previewFromZApi(payload: ZApiReceivedPayload): string {
  if (payload.text?.message) return payload.text.message.slice(0, 120);
  if (payload.image) return payload.image.caption ? `📷 ${payload.image.caption}` : "📷 Imagem";
  if (payload.audio) return "🎤 Áudio";
  if (payload.video) return payload.video.caption ? `🎬 ${payload.video.caption}` : "🎬 Vídeo";
  if (payload.document) return `📎 ${payload.document.fileName ?? "Documento"}`;
  if (payload.sticker) return "🙂 Figurinha";
  return "[mensagem]";
}

function mediaFromZApi(payload: ZApiReceivedPayload): {
  messageType: string;
  body: string;
  mediaUrl?: string;
  mediaMime?: string;
  mediaFilename?: string;
} {
  if (payload.text?.message) {
    return { messageType: "text", body: payload.text.message };
  }
  if (payload.image) {
    return {
      messageType: "image",
      body: payload.image.caption ?? "📷 Imagem",
      mediaUrl: payload.image.imageUrl,
      mediaMime: payload.image.mimeType,
    };
  }
  if (payload.audio) {
    return {
      messageType: "audio",
      body: "🎤 Áudio",
      mediaUrl: payload.audio.audioUrl,
      mediaMime: payload.audio.mimeType,
    };
  }
  if (payload.video) {
    return {
      messageType: "video",
      body: payload.video.caption ?? "🎬 Vídeo",
      mediaUrl: payload.video.videoUrl,
      mediaMime: payload.video.mimeType,
    };
  }
  if (payload.document) {
    return {
      messageType: "document",
      body: payload.document.caption ?? `📎 ${payload.document.fileName ?? "Documento"}`,
      mediaUrl: payload.document.documentUrl,
      mediaMime: payload.document.mimeType,
      mediaFilename: payload.document.fileName,
    };
  }
  if (payload.sticker) {
    return {
      messageType: "sticker",
      body: "🙂 Figurinha",
      mediaUrl: payload.sticker.stickerUrl,
      mediaMime: payload.sticker.mimeType,
    };
  }
  return { messageType: "unknown", body: previewFromZApi(payload) };
}

/** Ignora status, stories, notificações e listas — não são conversas reais. */
function shouldIgnoreZApiMessage(payload: ZApiReceivedPayload): boolean {
  if (payload.isGroup) return true;
  if (payload.isNewsletter) return true;
  if (payload.isStatusReply) return true;
  if (payload.broadcast) return true;
  if (payload.notification) return true;
  const phone = payload.phone ?? "";
  if (phone.includes("@broadcast") || phone.includes("status@")) return true;
  return false;
}

async function processZApiReceived(tenantId: string, payload: ZApiReceivedPayload) {
  if (!payload.phone || !payload.messageId) {
    console.warn("[Z-API webhook] ignorado: sem phone ou messageId", payload.type);
    return;
  }
  if (shouldIgnoreZApiMessage(payload)) {
    console.info("[Z-API webhook] ignorado (status/notificação):", payload.notification ?? payload.phone);
    return;
  }

  const media = mediaFromZApi(payload);
  const preview = previewFromZApi(payload);
  const ts = new Date(payload.momment ?? Date.now());
  const contactName = payload.fromMe
    ? null
    : payload.senderName ?? payload.chatName ?? null;
  const direction = payload.fromMe ? "outbound" : "inbound";

  const conversationId = await upsertConversation(
    tenantId,
    payload.phone,
    contactName,
    preview,
    ts,
    { incrementUnread: direction === "inbound" },
  );

  const convId = conversationId.id;

  await insertWaMessage({
    tenantId,
    conversationId: convId,
    waMessageId: payload.messageId,
    direction,
    messageType: media.messageType,
    body: media.body,
    mediaId: media.mediaUrl ?? null,
    mediaMime: media.mediaMime ?? null,
    mediaFilename: media.mediaFilename ?? null,
    status: direction === "inbound" ? "delivered" : "sent",
    sentAt: ts,
    rawPayload: payload,
  });

  if (direction === "inbound") {
    await maybeSendAfterHoursAutoReply(
      tenantId,
      convId,
      payload.phone,
      conversationId.lastAfterHoursReplyAt,
    );
  } else {
    await trackStaffFirstResponse(convId);
  }
}

export function isZApiWebhookPayload(payload: unknown): payload is ZApiReceivedPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as ZApiReceivedPayload;
  return typeof p.type === "string" && /callback$/i.test(p.type);
}

export async function handleZApiWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: ZApiReceivedPayload;
  try {
    payload = (await request.json()) as ZApiReceivedPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const config = getZApiConfig();
  if (config?.instanceId && payload.instanceId && payload.instanceId !== config.instanceId) {
    return new Response("OK", { status: 200 });
  }

  const tenantId = await resolveTenantId().catch((e) => {
    console.error("[Z-API webhook] falha ao conectar Supabase:", e);
    return null;
  });
  if (!tenantId) {
    console.error(
      "[Z-API webhook] mensagem descartada — configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel. Diagnóstico: /api/whatsapp/webhook-status",
    );
    return new Response("OK", { status: 200 });
  }

  try {
    if (/^receivedcallback$/i.test(payload.type ?? "")) {
      await processZApiReceived(tenantId, payload);
    } else if (/^(messagestatuscallback|deliverycallback)$/i.test(payload.type ?? "")) {
      if (payload.messageId && payload.status) {
        await updateMessageStatus(payload.messageId, payload.status);
      }
    }
  } catch (e) {
    console.error("[Z-API webhook] error:", e);
  }

  return new Response("OK", { status: 200 });
}
