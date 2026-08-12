const CACHE = 'bible-api-v1';
const CACHEABLE = ['https://bible.helloao.org', 'https://bolls.life'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first, fall back to cache for external Bible API requests.
self.addEventListener('fetch', (event) => {
  if (!CACHEABLE.some(origin => event.request.url.startsWith(origin))) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.open(CACHE)
          .then(cache => cache.match(event.request))
          .then(cached => cached ?? new Response('{"error":"offline"}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }))
      )
  );
});
