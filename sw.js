// Modern PWA Service Worker (v14)
// Implements Stale-While-Revalidate with robust offline fallback for navigation requests.
const CACHE_NAME = "keystone-v15";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly when available (works offline),
// refresh the cache from the network in the background whenever it's reachable.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.url.startsWith("file:")) return;
  if (!req.url.startsWith(self.location.origin) && !req.url.startsWith(self.location.origin.replace("https://","http://"))) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // For navigation requests (HTML pages), ensure we always have a fallback
      if (req.mode === "navigate") {
        return fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return networkRes;
          })
          .catch(() => cached || caches.match("./index.html"));
      }

      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
