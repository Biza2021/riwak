const CACHE_NAME = "riwak-v8";
const CORE_URLS = [
  "/",
  "/register",
  "/staff/login",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/pwa/riwak-192.png",
  "/pwa/riwak-512.png",
];

const DYNAMIC_BYPASS_PREFIXES = [
  "/api/",
  "/staff",
  "/app",
  "/account",
  "/order",
  "/orders",
  "/reward",
  "/rewards",
  "/menu",
];

function matchesPrefix(pathname, prefix) {
  if (prefix.endsWith("/")) {
    return pathname.startsWith(prefix);
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((match) => match)),
    );
    return;
  }

  // Never serve authenticated, query-string, or explicitly no-store requests
  // from the offline cache. These need fresh network data.
  if (
    url.origin !== self.location.origin ||
    request.cache === "no-store" ||
    url.search ||
    DYNAMIC_BYPASS_PREFIXES.some((prefix) => matchesPrefix(url.pathname, prefix))
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = null;

  try {
    payload = event.data.json();
  } catch {
    payload = null;
  }

  if (!payload?.title) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body ?? "",
      icon: payload.icon ?? "/pwa/riwak-192.png?v=2026-04-17-appicon",
      badge: payload.badge ?? "/brand/riwak-icon-only.png?v=2026-04-17-transparent",
      tag: payload.tag ?? undefined,
      actions: Array.isArray(payload.actions) ? payload.actions : [],
      data: {
        url: payload.url ?? "/",
        approvalUrl: payload.data?.approvalUrl ?? "",
        stampRequestId: payload.data?.stampRequestId ?? "",
        customerId: payload.data?.customerId ?? "",
      },
    }),
  );
});

function openNotificationTarget(targetPath) {
  const targetUrl = new URL(targetPath ?? "/", self.location.origin).href;

  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const existingClient = clients[0];

      if (existingClient) {
        if ("navigate" in existingClient) {
          existingClient.navigate(targetUrl);
        }

        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const fallbackUrl = event.notification.data?.url ?? "/";
  const approvalUrl = event.notification.data?.approvalUrl ?? "";

  if (event.action === "approve-stamp-request" && approvalUrl) {
    event.waitUntil(
      fetch(approvalUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            return openNotificationTarget(fallbackUrl);
          }

          const payload = await response.json().catch(() => null);
          return openNotificationTarget(payload?.redirectUrl ?? fallbackUrl);
        })
        .catch(() => openNotificationTarget(fallbackUrl)),
    );
    return;
  }

  event.waitUntil(openNotificationTarget(fallbackUrl));
});
