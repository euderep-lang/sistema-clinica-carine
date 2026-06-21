import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente Meta WhatsApp Cloud API (servidor).
 */

const GRAPH_API = "https://graph.facebook.com/v21.0";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  appSecret?: string;
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return null;
  return {
    accessToken,
    phoneNumberId,
    appSecret: process.env.WHATSAPP_APP_SECRET,
  };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig() !== null;
}

async function graphRequest(
  config: WhatsAppConfig,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (json as { error?: { message?: string } })?.error?.message ?? res.statusText;
    throw new Error(err);
  }
  return json;
}

export async function sendWhatsAppText(
  config: WhatsAppConfig,
  toPhoneDigits: string,
  text: string,
): Promise<{ messageId: string }> {
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhoneDigits,
    type: "text",
    text: { preview_url: true, body: text },
  };
  const json = (await graphRequest(config, `/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { messages?: { id: string }[] };
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem");
  return { messageId };
}

export async function uploadWhatsAppMedia(
  config: WhatsAppConfig,
  file: Blob,
  mimeType: string,
  filename: string,
): Promise<{ mediaId: string }> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append("file", file, filename);

  const res = await fetch(`${GRAPH_API}/${config.phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  if (!json.id) throw new Error("Meta não retornou ID da mídia");
  return { mediaId: json.id };
}

export async function sendWhatsAppMedia(
  config: WhatsAppConfig,
  toPhoneDigits: string,
  type: "image" | "audio" | "video" | "document",
  mediaId: string,
  options?: { caption?: string; filename?: string },
): Promise<{ messageId: string }> {
  const mediaPayload: Record<string, unknown> = { id: mediaId };
  if (options?.caption && (type === "image" || type === "video" || type === "document")) {
    mediaPayload.caption = options.caption;
  }
  if (options?.filename && type === "document") {
    mediaPayload.filename = options.filename;
  }

  const body = {
    messaging_product: "whatsapp",
    to: toPhoneDigits,
    type,
    [type]: mediaPayload,
  };

  const json = (await graphRequest(config, `/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { messages?: { id: string }[] };
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem");
  return { messageId };
}

export async function getWhatsAppMediaUrl(
  config: WhatsAppConfig,
  mediaId: string,
): Promise<{ url: string; mimeType: string }> {
  const json = (await graphRequest(config, `/${mediaId}`)) as {
    url?: string;
    mime_type?: string;
  };
  if (!json.url) throw new Error("URL da mídia não encontrada");
  return { url: json.url, mimeType: json.mime_type ?? "application/octet-stream" };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);
  const hash = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
  } catch {
    return false;
  }
}

export interface MetaMessageTemplate {
  name: string;
  language: string;
  status: string;
  category?: string;
  components?: { type: string; text?: string }[];
}

export async function listWhatsAppTemplates(
  config: WhatsAppConfig,
): Promise<MetaMessageTemplate[]> {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!wabaId) return [];

  const json = (await graphRequest(config, `/${wabaId}/message_templates?limit=100`)) as {
    data?: MetaMessageTemplate[];
  };
  return (json.data ?? []).filter((t) => t.status === "APPROVED");
}

export async function sendWhatsAppTemplate(
  config: WhatsAppConfig,
  toPhoneDigits: string,
  templateName: string,
  languageCode: string,
  bodyVariables: string[] = [],
): Promise<{ messageId: string }> {
  const components =
    bodyVariables.length > 0
      ? [
          {
            type: "body",
            parameters: bodyVariables.map((text) => ({ type: "text", text })),
          },
        ]
      : undefined;

  const body = {
    messaging_product: "whatsapp",
    to: toPhoneDigits,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  };

  const json = (await graphRequest(config, `/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { messages?: { id: string }[] };
  const messageId = json.messages?.[0]?.id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem");
  return { messageId };
}

export async function sendMetaSocialText(
  recipientId: string,
  text: string,
  channel: "instagram" | "messenger",
): Promise<{ messageId: string }> {
  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN;
  if (!pageId || !accessToken) {
    throw new Error("Configure META_PAGE_ID e META_PAGE_ACCESS_TOKEN para Instagram/Messenger");
  }

  const body = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: "RESPONSE",
  };

  const endpoint =
    channel === "instagram"
      ? `${GRAPH_API}/${pageId}/messages?access_token=${accessToken}`
      : `${GRAPH_API}/${pageId}/messages?access_token=${accessToken}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    message_id?: string;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? res.statusText);
  const messageId = json.message_id;
  if (!messageId) throw new Error("Meta não retornou ID da mensagem social");
  return { messageId };
}

export { normalizeBrazilPhone } from "@/lib/wa-phone";
