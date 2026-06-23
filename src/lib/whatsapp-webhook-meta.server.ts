import {
  getWhatsAppConfig,
  verifyWebhookSignature,
} from "@/lib/whatsapp-meta.server";
import {
  insertWaMessage,
  resolveTenantId,
  updateMessageStatus,
  upsertConversation,
  upsertSocialConversation,
} from "@/lib/whatsapp-crm-storage.server";

interface WebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; mime_type?: string; filename?: string; caption?: string };
  sticker?: { id: string; mime_type?: string };
}

function previewFromMessage(msg: WebhookMessage): string {
  if (msg.type === "text" && msg.text?.body) return msg.text.body.slice(0, 120);
  if (msg.type === "image") return msg.image?.caption ? `📷 ${msg.image.caption}` : "📷 Imagem";
  if (msg.type === "audio") return "🎤 Áudio";
  if (msg.type === "video") return msg.video?.caption ? `🎬 ${msg.video.caption}` : "🎬 Vídeo";
  if (msg.type === "document") return `📎 ${msg.document?.filename ?? "Documento"}`;
  if (msg.type === "sticker") return "🙂 Figurinha";
  return `[${msg.type}]`;
}

function mediaFromMessage(msg: WebhookMessage): {
  mediaId?: string;
  mediaMime?: string;
  mediaFilename?: string;
  body?: string;
} {
  if (msg.type === "text") return { body: msg.text?.body };
  if (msg.type === "image")
    return { mediaId: msg.image?.id, mediaMime: msg.image?.mime_type, body: msg.image?.caption };
  if (msg.type === "audio") return { mediaId: msg.audio?.id, mediaMime: msg.audio?.mime_type };
  if (msg.type === "video")
    return { mediaId: msg.video?.id, mediaMime: msg.video?.mime_type, body: msg.video?.caption };
  if (msg.type === "document")
    return {
      mediaId: msg.document?.id,
      mediaMime: msg.document?.mime_type,
      mediaFilename: msg.document?.filename,
      body: msg.document?.caption,
    };
  if (msg.type === "sticker")
    return { mediaId: msg.sticker?.id, mediaMime: msg.sticker?.mime_type };
  return {};
}

async function processInboundMessage(tenantId: string, msg: WebhookMessage, contactName?: string) {
  const preview = previewFromMessage(msg);
  const ts = new Date(Number(msg.timestamp) * 1000);
  const conversation = await upsertConversation(tenantId, msg.from, contactName ?? null, preview, ts);
  const media = mediaFromMessage(msg);

  await insertWaMessage({
    tenantId,
    conversationId: conversation.id,
    waMessageId: msg.id,
    direction: "inbound",
    messageType: msg.type,
    body: media.body ?? preview,
    mediaId: media.mediaId ?? null,
    mediaMime: media.mediaMime ?? null,
    mediaFilename: media.mediaFilename ?? null,
    sentAt: ts,
    rawPayload: msg,
  });
}

type SocialMessage = {
  mid: string;
  text?: string;
  attachments?: { type: string; payload?: { url?: string } }[];
};

async function processSocialInbound(
  tenantId: string,
  channel: "instagram" | "messenger",
  senderId: string,
  senderName: string | null,
  message: SocialMessage,
  timestamp: number,
) {
  const ts = new Date(timestamp);
  let preview = message.text?.slice(0, 120) ?? "";
  let messageType = "text";
  let body = message.text ?? "";
  let mediaUrl: string | null = null;

  const attachment = message.attachments?.[0];
  if (attachment) {
    messageType = attachment.type === "image" ? "image" : attachment.type === "audio" ? "audio" : "document";
    preview =
      attachment.type === "image"
        ? "📷 Imagem"
        : attachment.type === "audio"
          ? "🎤 Áudio"
          : attachment.type === "video"
            ? "🎬 Vídeo"
            : "📎 Anexo";
    body = preview;
    mediaUrl = attachment.payload?.url ?? null;
  }

  if (!preview) preview = "Nova mensagem";

  const conversation = await upsertSocialConversation(tenantId, channel, senderId, senderName, preview, ts);

  await insertWaMessage({
    tenantId,
    conversationId: conversation.id,
    waMessageId: message.mid,
    direction: "inbound",
    messageType,
    body,
    mediaId: mediaUrl,
    sentAt: ts,
    rawPayload: message,
  });
}

export async function handleMetaWhatsAppWebhook(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "clinicos_whatsapp";

  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const config = getWhatsAppConfig();

  if (config?.appSecret) {
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifyWebhookSignature(rawBody, sig, config.appSecret)) {
      return new Response("Invalid signature", { status: 403 });
    }
  }

  let payload: {
    object?: string;
    entry?: {
      id?: string;
      changes?: {
        value?: {
          messages?: WebhookMessage[];
          contacts?: { profile?: { name?: string }; wa_id?: string }[];
          statuses?: { id: string; status: string; errors?: { message?: string }[] }[];
          metadata?: { phone_number_id?: string };
        };
      }[];
      messaging?: {
        sender?: { id: string };
        recipient?: { id: string };
        timestamp?: number;
        message?: SocialMessage;
      }[];
    }[];
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const tenantId = await resolveTenantId().catch((e) => {
    console.error("[Meta webhook] falha ao conectar Supabase:", e);
    return null;
  });
  if (!tenantId) {
    console.error("[Meta webhook] Supabase indisponível");
    return new Response("Service Unavailable", { status: 503 });
  }

  const socialObject = payload.object;
  const isSocial = socialObject === "page" || socialObject === "instagram";
  const socialChannel: "instagram" | "messenger" =
    socialObject === "instagram" ? "instagram" : "messenger";

  for (const entry of payload.entry ?? []) {
    if (isSocial) {
      for (const evt of entry.messaging ?? []) {
        if (!evt.message?.mid || !evt.sender?.id) continue;
        try {
          await processSocialInbound(
            tenantId,
            socialChannel,
            evt.sender.id,
            null,
            evt.message,
            (evt.timestamp ?? Date.now()) * (String(evt.timestamp).length <= 10 ? 1000 : 1),
          );
        } catch (e) {
          console.error("[Meta webhook] social inbound error:", e);
        }
      }
      continue;
    }

    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      if (config && value.metadata?.phone_number_id && value.metadata.phone_number_id !== config.phoneNumberId) {
        continue;
      }

      const contactName = value.contacts?.[0]?.profile?.name;

      for (const msg of value.messages ?? []) {
        try {
          await processInboundMessage(tenantId, msg, contactName);
        } catch (e) {
          console.error("[Meta webhook] inbound error:", e);
        }
      }

      for (const st of value.statuses ?? []) {
        try {
          await updateMessageStatus(st.id, st.status, st.errors?.[0]?.message);
        } catch (e) {
          console.error("[Meta webhook] status error:", e);
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
}
