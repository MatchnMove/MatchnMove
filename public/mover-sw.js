/* global self, caches */
const CACHE = "matchnmove-mover-shell-v1";
const OFFLINE = "/mover-offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE, "/mover-app/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("matchnmove-mover-shell-") && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

// Customer details and authenticated pages are never cached on the device.
self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).origin === self.location.origin && new URL(event.request.url).pathname === "/mover-app/icon-192.png") {
    event.respondWith(caches.match("/mover-app/icon-192.png").then((cached) => cached || fetch(event.request)));
    return;
  }
  if (event.request.mode === "navigate" && new URL(event.request.url).pathname.startsWith("/mover/")) {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
  }
});

self.addEventListener("push", (event) => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { /* Show a safe default for an invalid payload. */ }
  let safeUrl = `${self.location.origin}/mover/dashboard`;
  try {
    const url = new URL(message.url || "/mover/dashboard?tab=leads", self.location.origin);
    if (url.origin === self.location.origin && url.pathname === "/mover/dashboard") safeUrl = url.href;
  } catch { /* Keep notification navigation on the dashboard. */ }
  event.waitUntil(self.registration.showNotification(message.title || "New Match 'n Move alert", {
    body: message.body || "Open your mover dashboard to see your updates.",
    icon: "/mover-app/icon-192.png",
    badge: "/mover-app/badge-96.png",
    tag: message.tag || "matchnmove-alert",
    data: { url: safeUrl },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/mover/dashboard", self.location.origin);
  if (target.origin !== self.location.origin || target.pathname !== "/mover/dashboard") return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).pathname.startsWith("/mover/"));
    if (existing) {
      await existing.navigate(target.href);
      await existing.focus();
    } else await self.clients.openWindow(target.href);
  })());
});
