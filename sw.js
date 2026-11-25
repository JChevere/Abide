/* Abide offline worker: keeps the app working without internet. */
const CACHE = 'abide-v50';
const FONT_CACHE = 'abide-fonts-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const host = new URL(req.url).hostname;
  if (host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com') {
    /* fonts: keep a saved copy so the app looks the same offline */
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (new URL(req.url).origin !== location.origin) return;
  /* audio streams use range requests; let the browser handle them directly */
  if (req.headers.has('range') || req.destination === 'audio' || req.destination === 'video') return;
  const isPage = req.mode === 'navigate' || req.destination === 'document';
  if (isPage) {
    /* page: always check the network for the newest version (skips the browser's 10-minute copy), fall back to the saved copy when offline */
    e.respondWith(fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(r => { if (!r || !r.ok) throw new Error('bad'); const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return n; })));
  }
});
