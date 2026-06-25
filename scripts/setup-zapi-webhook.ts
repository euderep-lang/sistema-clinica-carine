/**
 * Configura webhooks da Z-API apontando para o ClinicOS.
 *
 * Uso:
 *   ZAPI_WEBHOOK_BASE_URL=https://sistema-clinicos.vercel.app bun run scripts/setup-zapi-webhook.ts
 */
import { getZApiConfig } from "../src/lib/whatsapp-zapi.server";

const base = process.env.ZAPI_WEBHOOK_BASE_URL?.replace(/\/$/, "");
if (!base) {
  console.error("Defina ZAPI_WEBHOOK_BASE_URL (ex.: https://xxxx.ngrok-free.app)");
  process.exit(1);
}

const config = getZApiConfig();
if (!config) {
  console.error("Defina ZAPI_INSTANCE_ID e ZAPI_TOKEN no .env");
  process.exit(1);
}

const secret = process.env.ZAPI_WEBHOOK_SECRET?.trim();
const webhookUrl = `${base}/api/whatsapp/webhook${secret ? `?token=${encodeURIComponent(secret)}` : ""}`;

async function zapiPut(path: string, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config!.clientToken) headers["Client-Token"] = config!.clientToken;

  const res = await fetch(
    `https://api.z-api.io/instances/${config!.instanceId}/token/${config!.token}${path}`,
    { method: "PUT", headers, body: JSON.stringify(body) },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
  return json;
}

async function main() {
  console.log("Webhook:", webhookUrl);

  await zapiPut("/update-every-webhooks", { value: webhookUrl, notifySentByMe: true });
  console.log("✓ Todos os webhooks (receber, enviar, status, etc.)");

  console.log("\nPronto. Mande um WhatsApp de teste e abra /crm/inbox");
}

main().catch((e) => {
  console.error("Falhou:", (e as Error).message);
  if ((e as Error).message.includes("Client-Token")) {
    console.error("\nAdicione ZAPI_CLIENT_TOKEN no .env (painel Z-API → Segurança → Token da conta)");
  }
  process.exit(1);
});
