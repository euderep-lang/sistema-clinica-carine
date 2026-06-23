import { getWhatsAppProvider } from "@/lib/whatsapp-provider.server";
import { handleMetaWhatsAppWebhook } from "@/lib/whatsapp-webhook-meta.server";
import { handleZApiWebhook, isZApiWebhookPayload } from "@/lib/whatsapp-webhook-zapi.server";

function isMetaWebhookPayload(payload: unknown): boolean {
  const object = (payload as { object?: string } | null)?.object;
  return object === "whatsapp_business_account" || object === "page" || object === "instagram";
}

export async function handleWhatsAppWebhook(request: Request): Promise<Response> {
  if (request.method === "GET") {
    if (getWhatsAppProvider() === "zapi") {
      return new Response(
        "Webhook Z-API ativo — use POST com Client-Token. Abrir no navegador não testa o webhook.",
        { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }
    return handleMetaWhatsAppWebhook(request);
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (isZApiWebhookPayload(payload)) {
    return handleZApiWebhook(
      new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: rawBody,
      }),
    );
  }

  // Meta: WhatsApp Cloud + Instagram + Messenger (funciona junto com Z-API no WhatsApp)
  if (isMetaWebhookPayload(payload)) {
    return handleMetaWhatsAppWebhook(
      new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: rawBody,
      }),
    );
  }

  // Payload desconhecido — evita retry infinito de provedores
  if (getWhatsAppProvider() === "zapi") {
    return new Response("OK", { status: 200 });
  }

  return new Response("Bad Request", { status: 400 });
}
