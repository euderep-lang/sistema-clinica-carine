/**
 * Assinatura Web Push no client: registra o endpoint do navegador/PWA no servidor
 * para receber notificações 24/7, mesmo com o app fechado.
 */
import {
  deletePushSubscription,
  getWebPushConfig,
  savePushSubscription,
} from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function extractKeys(sub: PushSubscription): { p256dh: string; auth: string } | null {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) return null;
  return { p256dh, auth };
}

let inFlight: Promise<boolean> | null = null;

/**
 * Garante que este dispositivo esteja inscrito para Web Push.
 * Idempotente — pode ser chamado sempre que o CRM carrega.
 */
export async function ensureWaPushSubscription(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      if (typeof window === "undefined") return false;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
      if (!window.isSecureContext) return false;
      if (Notification.permission !== "granted") return false;

      const config = await getWebPushConfig();
      if (!config.enabled || !config.publicKey) return false;

      const reg = await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      const appServerKey = urlBase64ToUint8Array(config.publicKey);

      if (sub) {
        // Se a chave do servidor mudou, recria a assinatura.
        const existingKey = sub.options.applicationServerKey;
        const sameKey =
          existingKey &&
          new Uint8Array(existingKey).length === appServerKey.length &&
          new Uint8Array(existingKey).every((v, i) => v === appServerKey[i]);
        if (!sameKey) {
          await sub.unsubscribe().catch(() => {});
          sub = null;
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as BufferSource,
        });
      }

      const keys = extractKeys(sub);
      if (!keys) return false;

      await savePushSubscription({
        data: {
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: navigator.userAgent,
        },
      });
      return true;
    } catch (e) {
      console.error("[wa-push] falha ao assinar push:", e);
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Cancela a assinatura deste dispositivo (logout / desativar notificações). */
export async function removeWaPushSubscription(): Promise<void> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  } catch {
    // ignore
  }
}
