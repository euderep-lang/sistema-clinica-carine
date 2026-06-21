import { postWaNotificationToSw } from "@/lib/wa-pwa";

/** Estado compartilhado: conversa aberta no inbox (evita notificar a própria tela). */
export const waInboxFocus = {
  selectedConversationId: null as string | null,
};

export type WaNotificationPermission = "default" | "granted" | "denied" | "unsupported";

export function isSecureNotificationContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

export function getWaNotificationPermission(): WaNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!isSecureNotificationContext()) return "unsupported";
  return Notification.permission as WaNotificationPermission;
}

export async function requestWaNotificationPermission(): Promise<WaNotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!isSecureNotificationContext()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result as WaNotificationPermission;
}

export function canShowBrowserNotification(): boolean {
  return getWaNotificationPermission() === "granted";
}

export function vibrateWaNotification() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([180, 80, 180]);
  }
}

export function showWaBrowserNotification(options: {
  title: string;
  body: string;
  conversationId: string;
  onOpen: () => void;
}) {
  vibrateWaNotification();

  const swShown =
    typeof document !== "undefined" &&
    document.visibilityState !== "visible" &&
    postWaNotificationToSw({
      title: options.title,
      body: options.body,
      conversationId: options.conversationId,
    });

  if (swShown) return true;

  if (!canShowBrowserNotification()) return false;

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      tag: `wa-${options.conversationId}`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });
    notification.onclick = () => {
      notification.close();
      window.focus();
      options.onOpen();
    };
    return true;
  } catch {
    return false;
  }
}

export function playWaNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
    void ctx.close();
  } catch {
    // ignore
  }
}
