const CACHE_NAME = "yoohoo-cache-v2"; // bump on every deploy

const STATIC_ASSETS = [
    "/",
    "/index.html",
    "/main.css",
    "/components.css",
    "/themes.css",
    "/search-results.css",
    "/utils.js",
    "/ui.js",
    "/settings.js",
    "/search.js"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const url = event.request.url;

    // 🚫 NEVER cache API/search requests
    if (url.includes("/search") || url.includes("/api")) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            return (
                cached ||
                fetch(event.request).then(res => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, res.clone());
                        return res;
                    });
                })
            );
        })
    );
});