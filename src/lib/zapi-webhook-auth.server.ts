import type { ZApiConfig } from "@/lib/whatsapp-zapi.server";

/**
 * Autenticação do webhook de ENTRADA da Z-API.
 *
 * Importante: a Z-API NÃO envia o Client-Token nos webhooks que ela dispara para
 * o nosso servidor (o Client-Token é usado só nas chamadas que NÓS fazemos para a Z-API).
 * Por isso a proteção do webhook é via segredo na própria URL configurada na Z-API
 * (ex.: .../api/whatsapp/webhook?token=SEGREDO), que só a Z-API conhece.
 *
 * Se ZAPI_WEBHOOK_SECRET não estiver definido, o webhook é aceito (a checagem de
 * instanceId no payload ainda oferece uma barreira básica). Defina o segredo para
 * habilitar a validação forte.
 */
export function verifyZApiWebhookAuth(
  request: Request,
  _config: ZApiConfig | null,
): Response | null {
  const secret = process.env.ZAPI_WEBHOOK_SECRET?.trim();
  if (!secret) return null;

  const url = new URL(request.url);
  const received =
    url.searchParams.get("token")?.trim() ||
    url.searchParams.get("secret")?.trim() ||
    request.headers.get("Client-Token")?.trim() ||
    request.headers.get("client-token")?.trim() ||
    "";

  if (received !== secret) {
    console.warn("[Z-API webhook] segredo do webhook inválido ou ausente");
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}
