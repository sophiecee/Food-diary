// Lets the food diary open with no WiFi. Upload once alongside index.html;
// it doesn't need changing when index.html is updated.
const CACHE = 'food-diary-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // database calls go straight through
  const key = url.origin + url.pathname;               // ignore ?v= cache-busters
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    });
    // Network first (so updates arrive), but give up after 4 s on dead WiFi.
    const timeout = new Promise(r => setTimeout(r, 4000));
    const res = await Promise.race([network.catch(() => null), timeout]);
    if (res) return res;
    const cached = await cache.match(key) || await cache.match(url.origin + url.pathname.replace(/index\.html$/, ''));
    if (cached) return cached;
    return network;
  })());
});
