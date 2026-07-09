/**
 * Cliente Z-API (WhatsApp via instância + QR code).
 * Docs: https://developer.z-api.io/
 */

import { isValidContactPhotoUrl } from "@/lib/wa-contact-photo";
import { normalizeBrazilPhone } from "@/lib/wa-phone";

const ZAPI_BASE = "https://api.z-api.io/instances";

export interface ZApiConfig {
  instanceId: string;
  token: string;
  clientToken?: string;
}

export function getZApiConfig(): ZApiConfig | null {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) return null;
  return {
    instanceId,
    token,
    clientToken: process.env.ZAPI_CLIENT_TOKEN,
  };
}

function zapiUrl(config: ZApiConfig, path: string) {
  const base = `${ZAPI_BASE}/${config.instanceId}/token/${config.token}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function zapiHeaders(config: ZApiConfig, extra?: Record<string, string>) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
  if (config.clientToken) headers["Client-Token"] = config.clientToken;
  return headers;
}

async function zapiRequest<T>(config: ZApiConfig, path: string, body?: unknown, method: "GET" | "POST" = "POST"): Promise<T> {
  const res = await fetch(zapiUrl(config, path), {
    method,
    headers: zapiHeaders(config),
    body: method === "POST" && body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) {
    const err = (json as { error?: string; message?: string }).error ?? (json as { message?: string }).message ?? res.statusText;
    throw new Error(typeof err === "string" ? err : "Erro na Z-API");
  }
  return json;
}

export interface ZApiStatusResult {
  connected: boolean;
  smartphoneConnected?: boolean;
  error?: string;
}

export async function getZApiStatus(config: ZApiConfig): Promise<ZApiStatusResult> {
  try {
    const json = await zapiRequest<{
      connected?: boolean;
      smartphoneConnected?: boolean;
      status?: string;
    }>(config, "/status", undefined, "GET");
    const connected =
      json.connected === true ||
      json.smartphoneConnected === true ||
      json.status === "connected";
    return { connected, smartphoneConnected: json.smartphoneConnected };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : "Erro ao consultar Z-API" };
  }
}

function toDataUri(base64: string, mimeType: string) {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimeType};base64,${base64}`;
}

function fileExtension(filename: string, fallback = "bin") {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 6 ? ext : fallback;
}

export interface ZApiContactMetadata {
  name?: string;
  phone?: string;
  notify?: string;
  short?: string;
  imgUrl?: string;
  about?: string | null;
  lid?: string;
}

function contactLookupKeys(phone: string): string[] {
  const keys = new Set<string>();
  const raw = phone.trim();
  if (raw) keys.add(raw);
  const normalized = normalizeBrazilPhone(raw);
  if (normalized) keys.add(normalized);
  if (/@lid/i.test(raw)) keys.add(raw.replace(/@lid/i, "").trim());
  return [...keys];
}

/** Metadados do contato (nome, imgUrl, lid). Mais confiável que get-profile-picture. */
export async function getZApiContactMetadata(
  config: ZApiConfig,
  phone: string,
): Promise<ZApiContactMetadata | null> {
  try {
    const json = await zapiRequest<ZApiContactMetadata | { error?: string; message?: string; statusCode?: number } | null>(
      config,
      `/contacts/${encodeURIComponent(phone)}`,
      undefined,
      "GET",
    );
    if (!json || typeof json !== "object") return null;
    if ("error" in json || ("message" in json && !("phone" in json))) return null;
    return json as ZApiContactMetadata;
  } catch {
    return null;
  }
}

export async function getZApiContactPhoto(config: ZApiConfig, phone: string): Promise<string | null> {
  for (const key of contactLookupKeys(phone)) {
    const meta = await getZApiContactMetadata(config, key);
    if (isValidContactPhotoUrl(meta?.imgUrl)) return meta!.imgUrl!.trim();

    if (meta?.lid) {
      const byLid = await getZApiContactMetadata(config, meta.lid);
      if (isValidContactPhotoUrl(byLid?.imgUrl)) return byLid!.imgUrl!.trim();
    }

    if (meta?.phone) {
      const byPhone = await getZApiContactMetadata(config, meta.phone);
      if (isValidContactPhotoUrl(byPhone?.imgUrl)) return byPhone!.imgUrl!.trim();
    }

    try {
      const json = await zapiRequest<{ link?: string | null } | null>(
        config,
        `/contacts/get-profile-picture?phone=${encodeURIComponent(key)}`,
        undefined,
        "GET",
      );
      const link = json && typeof json === "object" ? json.link?.trim() : null;
      if (isValidContactPhotoUrl(link)) return link!;
    } catch {
      // get-profile-picture costuma retornar null quando imgUrl já está no metadata
    }
  }

  return null;
}

export async function sendZApiText(
  config: ZApiConfig,
  phone: string,
  message: string,
  options?: { replyToWaMessageId?: string },
) {
  const json = await zapiRequest<{ messageId?: string; id?: string; zaapId?: string }>(config, "/send-text", {
    phone,
    message,
    ...(options?.replyToWaMessageId ? { messageId: options.replyToWaMessageId } : {}),
  });
  const messageId = json.messageId ?? json.id ?? json.zaapId;
  if (!messageId) throw new Error("Z-API não retornou ID da mensagem");
  return { messageId };
}

export async function sendZApiMedia(
  config: ZApiConfig,
  phone: string,
  mediaType: "image" | "audio" | "video" | "document",
  base64: string,
  mimeType: string,
  filename: string,
  caption?: string,
) {
  const dataUri = toDataUri(base64, mimeType);
  let json: { messageId?: string; id?: string; zaapId?: string };

  if (mediaType === "image") {
    const imageMime =
      mimeType.includes("jpeg") || mimeType.includes("jpg")
        ? "image/jpeg"
        : mimeType.includes("png")
          ? "image/png"
          : mimeType.includes("webp")
            ? "image/webp"
            : mimeType.startsWith("image/")
              ? mimeType
              : "image/jpeg";
    json = await zapiRequest(config, "/send-image", {
      phone,
      image: toDataUri(base64, imageMime),
      caption: caption ?? "",
    });
  } else if (mediaType === "audio") {
    const isOgg = /ogg|opus/i.test(mimeType);
    const isMp3 = /mpeg|mp3/i.test(mimeType);
    const audioMime = isMp3
      ? "audio/mpeg"
      : isOgg
        ? "audio/ogg; codecs=opus"
        : mimeType.includes("mp4") || mimeType.includes("m4a") || mimeType.includes("aac") || mimeType.includes("caf")
          ? "audio/mp4"
          : mimeType;
    json = await zapiRequest(config, "/send-audio", {
      phone,
      audio: toDataUri(base64, audioMime),
      // waveform só com OGG Opus; M4A/MP3 com waveform quebra no WhatsApp do destinatário
      waveform: isOgg,
    });
  } else if (mediaType === "video") {
    json = await zapiRequest(config, "/send-video", {
      phone,
      video: dataUri,
      caption: caption ?? "",
    });
  } else {
    const ext = fileExtension(filename, "pdf");
    json = await zapiRequest(config, `/send-document/${ext}`, {
      phone,
      document: dataUri,
      fileName: filename,
      caption: caption ?? "",
    });
  }

  const messageId = json.messageId ?? json.id ?? json.zaapId;
  if (!messageId) throw new Error("Z-API não retornou ID da mensagem");
  return { messageId };
}

export async function sendZApiContact(
  config: ZApiConfig,
  phone: string,
  contactName: string,
  contactPhone: string,
  options?: { replyToWaMessageId?: string },
) {
  const json = await zapiRequest<{ messageId?: string; id?: string; zaapId?: string }>(config, "/send-contact", {
    phone,
    contactName,
    contactPhone,
    ...(options?.replyToWaMessageId ? { messageId: options.replyToWaMessageId } : {}),
  });
  const messageId = json.messageId ?? json.id ?? json.zaapId;
  if (!messageId) throw new Error("Z-API não retornou ID da mensagem");
  return { messageId };
}

export async function sendZApiLocation(
  config: ZApiConfig,
  phone: string,
  title: string,
  address: string,
  latitude: number | string,
  longitude: number | string,
  options?: { replyToWaMessageId?: string },
) {
  const json = await zapiRequest<{ messageId?: string; id?: string; zaapId?: string }>(config, "/send-location", {
    phone,
    title,
    address,
    latitude: String(latitude),
    longitude: String(longitude),
    ...(options?.replyToWaMessageId ? { messageId: options.replyToWaMessageId } : {}),
  });
  const messageId = json.messageId ?? json.id ?? json.zaapId;
  if (!messageId) throw new Error("Z-API não retornou ID da mensagem");
  return { messageId };
}

/**
 * Apaga uma mensagem no WhatsApp ("apagar para todos" / revoke).
 * owner=true quando a mensagem foi enviada por nós; false quando foi recebida.
 * Docs: DELETE /messages?messageId=&phone=&owner=
 */
export async function deleteZApiMessage(
  config: ZApiConfig,
  phone: string,
  messageId: string,
  owner: boolean,
) {
  const query = new URLSearchParams({
    messageId,
    phone,
    owner: owner ? "true" : "false",
  });
  const res = await fetch(zapiUrl(config, `/messages?${query.toString()}`), {
    method: "DELETE",
    headers: zapiHeaders(config),
  });
  if (!res.ok && res.status !== 204) {
    const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    const err = json.error ?? json.message ?? res.statusText;
    throw new Error(typeof err === "string" && err ? err : "Falha ao apagar mensagem na Z-API");
  }
}

export function resolveZApiMediaUrl(mediaRef: string, mimeType?: string | null) {
  if (mediaRef.startsWith("http://") || mediaRef.startsWith("https://")) {
    return { url: mediaRef, mimeType: mimeType ?? "application/octet-stream" };
  }
  throw new Error("Mídia indisponível");
}

export interface ZApiChatSummary {
  phone: string;
  name?: string;
  lastMessageTime?: string | number;
  lastMessageText?: string;
  lastMessage?: string;
  message?: string;
  messagesUnread?: number | string;
  isGroup?: boolean;
}

export async function getZApiChats(config: ZApiConfig, page = 1, pageSize = 100): Promise<ZApiChatSummary[]> {
  const json = await zapiRequest<ZApiChatSummary[] | { chats?: ZApiChatSummary[] }>(
    config,
    `/chats?page=${page}&pageSize=${pageSize}`,
    undefined,
    "GET",
  );
  const list = Array.isArray(json) ? json : (json.chats ?? []);
  return list.filter((c) => c.phone && !c.isGroup);
}
