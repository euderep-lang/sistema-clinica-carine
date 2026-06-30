/* Service Worker do CRM — cache do shell + notificações (in-app e Web Push 24/7). */

const CACHE = "clinicos-crm-v4";

async function setBadgeCount(count) {
  if (!("setAppBadge" in self.registration)) return;
  const safe = Math.max(0, Math.floor(Number(count) || 0));
  if (safe > 0) {
    await self.registration.setAppBadge(safe);
  } else {
    await self.registration.clearAppBadge();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isShell =
    url.pathname.startsWith("/crm") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icon-");

  if (!isShell) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await cache.match(request);
        return cached ?? Response.error();
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "wa-badge") {
    event.waitUntil(setBadgeCount(data.count ?? 0));
    return;
  }

  if (data.type !== "wa-message") return;

  event.waitUntil(
    (async () => {
      if (typeof data.unreadCount === "number") {
        await setBadgeCount(data.unreadCount);
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag ?? `wa-${data.conversationId}`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [180, 80, 180],
        data: { conversationId: data.conversationId },
        requireInteraction: false,
      });
    })(),
  );
});

/* Web Push: chega mesmo com o app fechado (24/7). */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "WhatsApp";
  const conversationId = payload.conversationId;
  const tag = payload.tag || (conversationId ? `wa-${conversationId}` : "wa");
  const url =
    payload.url || (conversationId ? `/crm/inbox?conversation=${conversationId}` : "/crm/inbox");

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const focused = clientsArr.find((c) => c.focused && c.visibilityState === "visible");
      if (focused) {
        focused.postMessage({ type: "wa-push", conversationId, unreadCount: payload.unreadCount });
        if (typeof payload.unreadCount === "number") {
          await setBadgeCount(payload.unreadCount);
        }
        return;
      }

      if (typeof payload.unreadCount === "number") {
        await setBadgeCount(payload.unreadCount);
      }

      await self.registration.showNotification(title, {
        body: payload.body || "Nova mensagem",
        tag,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [180, 80, 180],
        data: { conversationId, url },
        renotify: true,
        requireInteraction: false,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const conversationId = data.conversationId;
  const targetUrl =
    data.url || (conversationId ? `/crm/inbox?conversation=${conversationId}` : "/crm/inbox");

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "wa-open-conversation", conversationId });
          return undefined;
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
