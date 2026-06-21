export async function registerWaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

export function postWaNotificationToSw(payload: {
  title: string;
  body: string;
  conversationId: string;
}) {
  if (!navigator.serviceWorker?.controller) return false;
  navigator.serviceWorker.controller.postMessage({
    type: "wa-message",
    title: payload.title,
    body: payload.body,
    conversationId: payload.conversationId,
    tag: `wa-${payload.conversationId}`,
  });
  return true;
}

export function listenWaSwNavigation(onOpen: (conversationId: string | undefined) => void) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return () => {};

  const handler = (event: MessageEvent) => {
    const data = event.data as { type?: string; conversationId?: string } | undefined;
    if (data?.type === "wa-open-conversation") onOpen(data.conversationId);
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
