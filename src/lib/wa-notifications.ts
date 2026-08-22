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

let lastVibrateAt = 0;

export function vibrateWaNotification() {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const now = Date.now();
  if (now - lastVibrateAt < 900) return;
  lastVibrateAt = now;
  navigator.vibrate([120, 60, 120]);
}

export function showWaBrowserNotification(options: {
  title: string;
  body: string;
  conversationId: string;
  onOpen: () => void;
  vibrate?: boolean;
}) {
  if (options.vibrate !== false) vibrateWaNotification();

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

let sharedAudioCtx: AudioContext | null = null;
let lastSoundAt = 0;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new Ctor();
  }
  return sharedAudioCtx;
}

export function playWaNotificationSound() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastSoundAt < 900) return;
  lastSoundAt = now;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.035;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore
  }
}
