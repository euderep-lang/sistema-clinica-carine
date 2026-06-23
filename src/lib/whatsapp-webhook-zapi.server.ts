import { processDueFollowUps } from "@/lib/wa-follow-up.server";
import { isBrazilMobileE164, isWhatsAppLid, normalizeBrazilPhone } from "@/lib/wa-phone";
import { verifyZApiWebhookAuth } from "@/lib/zapi-webhook-auth.server";
import {
  insertWaMessage,
  maybeSendAfterHoursAutoReply,
  resolveTenantId,
  trackStaffFirstResponse,
  updateMessageStatus,
  upsertConversation,
} from "@/lib/whatsapp-crm-storage.server";
import { getZApiConfig } from "@/lib/whatsapp-zapi.server";
import { isValidContactPhotoUrl } from "@/lib/wa-contact-photo";

interface ZApiReceivedPayload {
  type?: string;
  instanceId?: string;
  phone?: string;
  messageId?: string;
  fromMe?: boolean;
  momment?: number;
  senderName?: string;
  chatName?: string;
  chatLid?: string;
  senderLid?: string;
  participantPhone?: string | null;
  participantLid?: string | null;
  connectedPhone?: string;
  senderPhoto?: string;
  photo?: string;
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

/** Resolve o contato real — Z-API pode enviar @lid no phone, principalmente em fromMe. */
function resolveZApiContact(payload: ZApiReceivedPayload): {
  phone: string;
  waId: string | null;
  contactName: string | null;
} {
  const waId =
    payload.chatLid?.trim() ||
    payload.senderLid?.trim() ||
    payload.participantLid?.trim() ||
    (isWhatsAppLid(payload.phone ?? "") ? payload.phone!.trim() : null);

  const contactName = payload.fromMe
    ? payload.chatName ?? payload.senderName ?? null
    : payload.senderName ?? payload.chatName ?? null;

  let phone = payload.phone?.trim() ?? "";

  // Mensagem enviada pelo app: o destinatário vem em participantPhone
  if (payload.fromMe && payload.participantPhone?.trim()) {
    phone = payload.participantPhone.trim();
  } else if (!isBrazilMobileE164(normalizeBrazilPhone(phone)) && payload.participantPhone?.trim()) {
    phone = payload.participantPhone.trim();
  }

  return { phone, waId, contactName };
}

/** Foto de perfil do contato (não do número conectado). */
function photoFromZApi(payload: ZApiReceivedPayload): string | null {
  const candidates = payload.fromMe
    ? [payload.photo, payload.senderPhoto]
    : [payload.senderPhoto, payload.photo];
  for (const url of candidates) {
    if (isValidContactPhotoUrl(url)) return url!.trim();
  }
  return null;
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

/** Ignora grupos, newsletters e postagens de status — mas permite resposta em cima de status. */
function shouldIgnoreZApiMessage(payload: ZApiReceivedPayload): boolean {
  if (payload.isGroup) return true;
  if (payload.isNewsletter) return true;
  if (payload.broadcast) return true;
  if (payload.notification) return true;
  const phone = payload.phone ?? "";
  if (phone.includes("@broadcast")) return true;
  if (!payload.isStatusReply && phone.includes("status@")) return true;
  return false;
}

async function processZApiReceived(tenantId: string, payload: ZApiReceivedPayload) {
  if (!payload.phone || !payload.messageId) {
    console.warn("[Z-API webhook] ignorado: sem phone ou messageId", payload.type);
    return;
  }
  if (shouldIgnoreZApiMessage(payload)) {
    console.info("[Z-API webhook] ignorado (grupo/status/notificação):", payload.notification ?? payload.phone);
    return;
  }

  const media = mediaFromZApi(payload);
  const preview = previewFromZApi(payload);
  const ts = new Date(payload.momment ?? Date.now());
  const { phone, waId, contactName } = resolveZApiContact(payload);
  const direction = payload.fromMe ? "outbound" : "inbound";
  const photoUrl = photoFromZApi(payload);

  const conversationId = await upsertConversation(
    tenantId,
    phone,
    contactName,
    preview,
    ts,
    { incrementUnread: direction === "inbound", waId, rawPhone: payload.phone ?? phone, photoUrl },
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
      phone,
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
  const authError = verifyZApiWebhookAuth(request, config);
  if (authError) return authError;

  if (config?.instanceId && payload.instanceId && payload.instanceId !== config.instanceId) {
    return new Response("OK", { status: 200 });
  }

  const tenantId = await resolveTenantId().catch((e) => {
    console.error("[Z-API webhook] falha ao conectar Supabase:", e);
    return null;
  });
  if (!tenantId) {
    console.error(
      "[Z-API webhook] Supabase indisponível — configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.",
    );
    return new Response("Service Unavailable", { status: 503 });
  }

  try {
    if (/^receivedcallback$/i.test(payload.type ?? "")) {
      await processZApiReceived(tenantId, payload);
      // Só dispara follow-ups em mensagem do paciente — evita corrida com eco fromMe do envio automático.
      if (!payload.fromMe) {
        void processDueFollowUps(10).catch((e) =>
          console.error("[Z-API webhook] follow-up process error:", e),
        );
      }
    } else if (/^(messagestatuscallback|deliverycallback)$/i.test(payload.type ?? "")) {
      if (payload.messageId && payload.status) {
        await updateMessageStatus(payload.messageId, payload.status);
      }
    }
  } catch (e) {
    console.error("[Z-API webhook] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
