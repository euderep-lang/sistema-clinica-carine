/// <reference lib="webworker" />

const CACHE = "clinicos-crm-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

type WaNotifyPayload = {
  type: "wa-message";
  title: string;
  body: string;
  conversationId: string;
  tag?: string;
};

self.addEventListener("message", (event) => {
  const data = event.data as WaNotifyPayload | undefined;
  if (!data || data.type !== "wa-message") return;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag ?? `wa-${data.conversationId}`,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [180, 80, 180],
      data: { conversationId: data.conversationId },
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const conversationId = (event.notification.data as { conversationId?: string } | undefined)
    ?.conversationId;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "wa-open-conversation", conversationId });
          return;
        }
      }
      const url = conversationId
        ? `/crm/inbox?conversation=${conversationId}`
        : "/crm/inbox";
      return self.clients.openWindow(url);
    }),
  );
});

export {};
