const SHELL = 'bible-shell-v1';
const API   = 'bible-api-v1';
const BIBLE_ORIGINS = ['https://bible.helloao.org', 'https://bolls.life'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL && k !== API).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = request.url;

  // Never intercept API routes — let Express handle them
  if (new URL(url).pathname.startsWith('/api/')) return;

  // External Bible API: network-first, fall back to cache
  if (BIBLE_ORIGINS.some(o => url.startsWith(o))) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(API).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() =>
          caches.open(API).then(c => c.match(request)).then(
            hit => hit ?? new Response('{"error":"offline"}', {
              status: 503, headers: { 'Content-Type': 'application/json' },
            })
          )
        )
    );
    return;
  }

  // App-shell navigation: network-first, fall back to cached index.html
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(SHELL).then(c => c.put(request, res.clone()));
          return res;
        })
        .catch(() =>
          caches.open(SHELL).then(c =>
            c.match('/index.html').then(hit => hit ?? c.match('/'))
          )
        )
    );
    return;
  }

  // Same-origin static assets (hashed JS/CSS/images): cache-first
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.open(SHELL).then(c =>
        c.match(request).then(hit => {
          if (hit) return hit;
          return fetch(request).then(res => {
            if (res.ok) c.put(request, res.clone());
            return res;
          });
        })
      )
    );
  }
});
