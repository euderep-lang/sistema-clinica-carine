import type { ZApiConfig } from "@/lib/whatsapp-zapi.server";

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

/** Valida Client-Token da Z-API. Retorna Response de erro ou null se autorizado. */
export function verifyZApiWebhookAuth(
  request: Request,
  config: ZApiConfig | null,
): Response | null {
  const expected = config?.clientToken?.trim();

  if (isProductionRuntime() && !expected) {
    console.error("[Z-API webhook] ZAPI_CLIENT_TOKEN obrigatório em produção");
    return new Response("Webhook auth not configured", { status: 503 });
  }

  if (!expected) return null;

  const received =
    request.headers.get("Client-Token")?.trim() ??
    request.headers.get("client-token")?.trim() ??
    "";

  if (received !== expected) {
    console.warn("[Z-API webhook] Client-Token inválido ou ausente");
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
