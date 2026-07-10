import {
  getWhatsAppConfig,
  getWhatsAppMediaUrl,
  isWhatsAppConfigured as isMetaConfigured,
  sendWhatsAppMedia,
  sendWhatsAppText,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp-meta.server";
import {
  deleteZApiMessage,
  forwardZApiMessage,
  getZApiConfig,
  getZApiContactPhoto,
  getZApiStatus,
  resolveZApiMediaUrl,
  sendZApiMedia,
  sendZApiText,
  sendZApiContact,
  sendZApiLocation,
} from "@/lib/whatsapp-zapi.server";

export type WhatsAppProviderKind = "meta" | "zapi";

export function getWhatsAppProvider(): WhatsAppProviderKind | null {
  const explicit = (process.env.WHATSAPP_PROVIDER ?? "").toLowerCase();
  if (explicit === "zapi") return getZApiConfig() ? "zapi" : null;
  if (explicit === "meta") return isMetaConfigured() ? "meta" : null;
  if (getZApiConfig()) return "zapi";
  if (isMetaConfigured()) return "meta";
  return null;
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppProvider() !== null;
}

export function getWhatsAppStatusPayload() {
  const provider = getWhatsAppProvider();
  return {
    configured: provider !== null,
    provider,
    webhookUrl: "/api/whatsapp/webhook",
  };
}

export async function getWhatsAppConnectionStatus() {
  const base = getWhatsAppStatusPayload();
  if (!base.configured) return { ...base, connected: false as const };

  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) return { ...base, connected: false as const };
    const status = await getZApiStatus(config);
    return { ...base, connected: status.connected, connectionError: status.error ?? null };
  }

  return { ...base, connected: true as const, connectionError: null };
}

export async function providerSendText(
  phone: string,
  text: string,
  options?: { replyToWaMessageId?: string },
) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    return sendZApiText(config, phone, text, options);
  }
  if (provider === "meta") {
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");
    return sendWhatsAppText(config, phone, text);
  }
  throw new Error("WhatsApp não configurado");
}

export async function providerSendMedia(
  phone: string,
  mediaType: "image" | "audio" | "video" | "document",
  base64: string,
  mimeType: string,
  filename: string,
  caption?: string,
) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    const { messageId } = await sendZApiMedia(config, phone, mediaType, base64, mimeType, filename, caption);
    return { messageId, mediaRef: null as string | null };
  }
  if (provider === "meta") {
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");
    const buffer = Buffer.from(base64, "base64");
    const blob = new Blob([buffer], { type: mimeType });
    const { mediaId } = await uploadWhatsAppMedia(config, blob, mimeType, filename);
    const { messageId } = await sendWhatsAppMedia(config, phone, mediaType, mediaId, {
      caption,
      filename,
    });
    return { messageId, mediaRef: mediaId };
  }
  throw new Error("WhatsApp não configurado");
}

export async function providerSendContact(
  phone: string,
  contactName: string,
  contactPhone: string,
  options?: { replyToWaMessageId?: string },
) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    return sendZApiContact(config, phone, contactName, contactPhone, options);
  }
  throw new Error("Envio de contato disponível apenas com Z-API");
}

export async function providerSendLocation(
  phone: string,
  title: string,
  address: string,
  latitude: number,
  longitude: number,
  options?: { replyToWaMessageId?: string },
) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    return sendZApiLocation(config, phone, title, address, latitude, longitude, options);
  }
  throw new Error("Envio de localização disponível apenas com Z-API");
}

/**
 * Apaga uma mensagem para ambas as partes (revoke). Só disponível na Z-API —
 * a API da Meta não permite apagar mensagens já enviadas.
 */
export async function providerDeleteMessage(
  phone: string,
  waMessageId: string,
  owner: boolean,
) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    await deleteZApiMessage(config, phone, waMessageId, owner);
    return;
  }
  throw new Error("Apagar para todos disponível apenas com Z-API");
}

export async function providerForwardMessage(
  destPhone: string,
  waMessageId: string,
  sourcePhone: string,
) {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) throw new Error("Z-API não configurada");
    return forwardZApiMessage(config, destPhone, waMessageId, sourcePhone);
  }
  throw new Error("Encaminhamento nativo disponível apenas com Z-API");
}

export async function providerResolveMediaUrl(mediaRef: string, mimeType?: string | null) {
  if (mediaRef.startsWith("data:")) {
    return { url: mediaRef, mimeType: mimeType ?? "application/octet-stream" };
  }
  if (mediaRef.startsWith("http://") || mediaRef.startsWith("https://")) {
    return { url: mediaRef, mimeType: mimeType ?? "application/octet-stream" };
  }
  const provider = getWhatsAppProvider();
  if (provider === "zapi") return resolveZApiMediaUrl(mediaRef, mimeType);
  if (provider === "meta") {
    const config = getWhatsAppConfig();
    if (!config) throw new Error("Meta WhatsApp não configurado");
    return getWhatsAppMediaUrl(config, mediaRef);
  }
  throw new Error("WhatsApp não configurado");
}

export async function providerGetContactPhoto(phone: string): Promise<string | null> {
  const provider = getWhatsAppProvider();
  if (provider === "zapi") {
    const config = getZApiConfig();
    if (!config) return null;
    return getZApiContactPhoto(config, phone);
  }
  return null;
}
