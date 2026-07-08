import { processDueFollowUps } from "@/lib/wa-follow-up.server";
import { isBrazilMobileE164, isWhatsAppLid, normalizeBrazilPhone } from "@/lib/wa-phone";
import { verifyZApiWebhookAuth } from "@/lib/zapi-webhook-auth.server";
import {
  insertWaMessage,
  markWaMessageDeletedByWaId,
  maybeSendAfterHoursAutoReply,
  resolveTenantId,
  trackStaffFirstResponse,
  updateMessageStatus,
  upsertConversation,
} from "@/lib/whatsapp-crm-storage.server";
import { getInboundPushUserIds, getTenantWaUnreadBadgeCount, sendPushToUsers } from "@/lib/web-push.server";
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
  reaction?: { value?: string; reaction?: string; referencedMessageId?: string } | string;
  location?: { latitude?: number | string; longitude?: number | string; name?: string; address?: string; url?: string };
  contact?: { displayName?: string; vCard?: string; vcard?: string };
  contacts?: { displayName?: string; vCard?: string; vcard?: string }[] | { contacts?: { displayName?: string }[] };
  poll?: { name?: string; question?: string; options?: ({ name?: string } | string)[] };
  buttonsResponseMessage?: { message?: string; buttonId?: string; title?: string };
  listResponseMessage?: { message?: string; title?: string; selectedRowId?: string };
  buttonReply?: { message?: string; title?: string };
  listReply?: { title?: string; message?: string };
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

function reactionValue(payload: ZApiReceivedPayload): string | null {
  const r = payload.reaction;
  if (!r) return null;
  if (typeof r === "string") return r.trim() || null;
  return (r.value ?? r.reaction ?? "")?.trim() || null;
}

function contactName(payload: ZApiReceivedPayload): string | null {
  const c = payload.contact;
  if (c?.displayName?.trim()) return c.displayName.trim();
  if (Array.isArray(payload.contacts)) {
    const first = payload.contacts[0];
    if (first?.displayName?.trim()) return first.displayName.trim();
  }
  return null;
}

function hasContact(payload: ZApiReceivedPayload): boolean {
  return (
    !!payload.contact ||
    (Array.isArray(payload.contacts) && payload.contacts.length > 0) ||
    (!!payload.contacts && !Array.isArray(payload.contacts) && !!payload.contacts.contacts?.length)
  );
}

function pollName(payload: ZApiReceivedPayload): string | null {
  return payload.poll?.name?.trim() || payload.poll?.question?.trim() || null;
}

function buttonOrListText(payload: ZApiReceivedPayload): string | null {
  return (
    payload.buttonsResponseMessage?.message?.trim() ||
    payload.buttonsResponseMessage?.title?.trim() ||
    payload.buttonReply?.message?.trim() ||
    payload.buttonReply?.title?.trim() ||
    payload.listResponseMessage?.title?.trim() ||
    payload.listResponseMessage?.message?.trim() ||
    payload.listReply?.title?.trim() ||
    payload.listReply?.message?.trim() ||
    null
  );
}

function previewFromZApi(payload: ZApiReceivedPayload): string {
  if (payload.text?.message) return payload.text.message.slice(0, 120);
  if (payload.image) return payload.image.caption ? `📷 ${payload.image.caption}` : "📷 Imagem";
  if (payload.audio) return "🎤 Áudio";
  if (payload.video) return payload.video.caption ? `🎬 ${payload.video.caption}` : "🎬 Vídeo";
  if (payload.document) return `📎 ${payload.document.fileName ?? "Documento"}`;
  if (payload.sticker) return "🙂 Figurinha";
  const reaction = reactionValue(payload);
  if (reaction) return `${reaction} Reagiu`;
  if (payload.location) return "📍 Localização";
  if (hasContact(payload)) {
    const name = contactName(payload);
    return name ? `👤 Contato: ${name}` : "👤 Contato";
  }
  const poll = pollName(payload);
  if (poll) return `📊 Enquete: ${poll}`;
  const btn = buttonOrListText(payload);
  if (btn) return btn.slice(0, 120);
  return "💬 Mensagem";
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
  const reaction = reactionValue(payload);
  if (reaction) {
    return { messageType: "reaction", body: `${reaction} Reagiu a uma mensagem` };
  }
  if (payload.location) {
    const loc = payload.location;
    const label = loc.name || loc.address || "Localização";
    const url =
      loc.url ||
      (loc.latitude != null && loc.longitude != null
        ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
        : undefined);
    return {
      messageType: "location",
      body: url ? `📍 ${label}\n${url}` : `📍 ${label}`,
    };
  }
  if (hasContact(payload)) {
    const name = contactName(payload);
    return { messageType: "contact", body: name ? `👤 Contato: ${name}` : "👤 Contato compartilhado" };
  }
  const poll = pollName(payload);
  if (poll) {
    const options = (payload.poll?.options ?? [])
      .map((o) => (typeof o === "string" ? o : o?.name))
      .filter(Boolean)
      .join(", ");
    return {
      messageType: "poll",
      body: options ? `📊 Enquete: ${poll}\nOpções: ${options}` : `📊 Enquete: ${poll}`,
    };
  }
  const btn = buttonOrListText(payload);
  if (btn) {
    return { messageType: "text", body: btn };
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
  if (media.messageType === "unknown") {
    const knownKeys = ["text", "image", "audio", "video", "document", "sticker", "reaction", "location", "contact", "contacts", "poll"];
    const extraKeys = Object.keys(payload).filter(
      (k) => !["type", "instanceId", "phone", "messageId", "fromMe", "momment", "senderName", "chatName", "connectedPhone"].includes(k),
    );
    console.warn(
      "[Z-API webhook] tipo de mensagem não reconhecido:",
      extraKeys.filter((k) => !knownKeys.includes(k)),
    );
  }
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

  // A mensagem já foi gravada acima. O pós-processamento (resposta automática,
  // tracking, push) não pode derrubar o webhook — senão a Z-API reentrega à toa.
  try {
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
  } catch (e) {
    console.error("[Z-API webhook] pós-processamento falhou (mensagem já gravada):", e);
  }

  // Web Push 24/7: admin e recepção são notificados de toda mensagem recebida.
  // (Profissional só recebe push quando uma conversa é transferida para ele.)
  if (direction === "inbound") {
    try {
      const userIds = await getInboundPushUserIds(tenantId);
      const unreadCount = await getTenantWaUnreadBadgeCount(tenantId);
      await sendPushToUsers(userIds, {
        title: `WhatsApp · ${contactName?.trim() || phone}`,
        body: preview || "Nova mensagem",
        conversationId: convId,
        tag: `wa-${convId}`,
        url: `/crm/inbox?conversation=${convId}`,
        unreadCount,
      });
    } catch (e) {
      console.error("[Z-API webhook] push falhou (mensagem já gravada):", e);
    }
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
      // Reflete no CRM quando o contato apaga uma mensagem para todos (revoke).
      if (payload.messageId && /^(deleted|revoked|revoke)$/i.test(payload.status ?? "")) {
        await markWaMessageDeletedByWaId(payload.messageId);
      } else if (payload.messageId && payload.status) {
        await updateMessageStatus(payload.messageId, payload.status);
      }
    } else if (/deletecallback$/i.test(payload.type ?? "") && payload.messageId) {
      await markWaMessageDeletedByWaId(payload.messageId);
    }
  } catch (e) {
    console.error("[Z-API webhook] error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
