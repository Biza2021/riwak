const CACHE_NAME = "riwak-v6";
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
