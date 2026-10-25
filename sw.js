/* Офлайн и быстрый старт: оформление и код берутся из кеша, данные — всегда свежие */
const CACHE = 'dembel-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET') return;
  if (u.hostname.endsWith('supabase.co') || u.hostname.includes('telegram')) return; // база — только из сети
  if (req.mode === 'navigate') { // сама страница: сначала сеть (чтобы обновления приходили), без сети — кеш
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./'))));
    return;
  }
  // файлы и шрифты: мгновенно из кеша, в фоне подтягиваем свежие
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req);
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
