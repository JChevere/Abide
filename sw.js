/* Abide offline worker: keeps the app working without internet. */
const CACHE = 'abide-v60';
const FONT_CACHE = 'abide-fonts-v1';
/* Bible Panorama hero art: the phone and tablet sizes are saved in the background so the pictures work offline */
const PANO_ART = ["hero-00-panorama", "hero-01-creation", "hero-02-garden-and-fall", "hero-03-before-the-flood", "hero-04-nations-and-babel", "hero-05-abraham", "hero-06-jacob", "hero-07-joseph", "hero-08-out-of-egypt", "hero-09-sinai-and-wilderness", "hero-10-joshua", "hero-11-judges-and-ruth", "hero-12-samuel-saul-david", "hero-13-solomon", "hero-14-divided-kingdom", "hero-15-exile-in-babylon", "hero-16-return-and-rebuilding", "hero-17-wisdom-books", "hero-18-prophets-and-promise"];
const PANO_SAVE = PANO_ART.flatMap(n => ['480', '960'].map(w => './assets/panorama/' + n + '-' + w + '.webp'));
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
function savePanoArt() {
  return caches.open(CACHE).then(c => PANO_SAVE.reduce((p, u) => p.then(() => c.match(u).then(hit => hit || c.add(u).catch(() => null))), Promise.resolve()));
}
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { savePanoArt(); }));
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
    /* page: try for the newest version, but never keep you waiting.
       If the network is slow or down, open the saved copy after 3 seconds and finish updating in the background. */
    const net = fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(r => {
      if (!r || !r.ok) throw new Error('bad');
      const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r;
    });
    const saved = () => caches.match(req).then(r => r || caches.match('./index.html'));
    e.waitUntil(net.catch(() => null));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done && r) { done = true; resolve(r); } };
      const timer = setTimeout(() => saved().then(finish), 3000);
      net.then(r => { clearTimeout(timer); finish(r); })
         .catch(() => { clearTimeout(timer); saved().then(r => r ? finish(r) : finish(fetch(req))); });
    }));
  } else if (/\/assets\/panorama\/hero-\d\d-[a-z-]+-\d+\.webp$/.test(req.url)) {
    /* hero art: saved copy first; if this size is not saved and there is no internet, show another saved size of the same picture */
    const base = req.url.replace(/-\d+\.webp$/, '');
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n && n.ok) { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return n; })
      .catch(() => caches.match(base + '-960.webp').then(a => a || caches.match(base + '-480.webp')).then(a => a || caches.match(base + '-1600.webp')).then(a => a || Response.error()))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return n; })));
  }
});
