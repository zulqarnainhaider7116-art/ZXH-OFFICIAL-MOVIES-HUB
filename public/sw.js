const CACHE_PREFIX = "zxh-xurvyna-";
const CACHE_NAME = CACHE_PREFIX + "shell-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/favicon.jpg",
  "/assets/xurvyna-app-icon-192.jpg",
  "/assets/xurvyna-app-icon-512.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses: keep live catalogue, search and playback data fresh.
  if (url.pathname.startsWith("/api/")) return;

  // App navigation: prefer the live site, but open the cached app shell offline.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put("/", response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || (await cache.match("/")) ||
          new Response("ZXH OFFICIAL is offline. Reconnect to the internet and try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
    })());
    return;
  }

  // Cache same-origin build assets after their first successful visit.
  // Cache-first keeps the installed shell usable offline; new hashed assets
  // are fetched normally and saved for the next offline session.
  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response("", { status: 504, statusText: "Offline asset unavailable" });
      }
    })());
  }
});
