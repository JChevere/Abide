/* Abide offline worker: keeps the app working without internet. */
const CACHE = 'abide-v67';
const FONT_CACHE = 'abide-fonts-v1';
/* Bible Panorama hero art: the phone and tablet sizes are saved in the background so the pictures work offline */
const PANO_ART = ["hero-00-panorama", "hero-01-creation", "hero-02-garden-and-fall", "hero-03-before-the-flood", "hero-04-nations-and-babel", "hero-05-abraham", "hero-06-jacob", "hero-07-joseph", "hero-08-out-of-egypt", "hero-09-sinai-and-wilderness", "hero-10-joshua", "hero-11-judges-and-ruth", "hero-12-samuel-saul-david", "hero-13-solomon", "hero-14-divided-kingdom", "hero-15-exile-in-babylon", "hero-16-return-and-rebuilding", "hero-17-wisdom-books", "hero-18-prophets-and-promise", "hero-19-birth-of-jesus", "hero-20-baptism-of-jesus", "hero-21-temptation-of-jesus", "hero-22-calling-of-disciples", "hero-23-sermon-on-the-mount", "hero-24-feeding-five-thousand", "hero-25-walking-on-water", "hero-26-transfiguration", "hero-27-triumphal-entry", "hero-28-last-supper", "hero-29-gethsemane", "hero-30-betrayal-and-arrest", "hero-31-trial-of-jesus", "hero-32-crucifixion", "hero-33-resurrection", "hero-34-ascension", "hero-35-pentecost", "hero-36-conversion-of-saul", "hero-37-missionary-journeys", "hero-39-letters-of-paul"];
const PANO_SAVE = PANO_ART.flatMap(n => ['480', '960'].map(w => './assets/panorama/' + n + '-' + w + '.webp'));
const PANO_ERAS = ['era-01-creation', 'era-02-the-fall', 'era-03-the-promise-to-abraham', 'era-04-egypt-and-the-law', 'era-05-land-kings-and-prophets', 'era-06-jesus', 'era-07-the-church', 'era-08-all-things-made-new'];
PANO_ERAS.forEach(n => ['192', '384'].forEach(w => PANO_SAVE.push('./assets/panorama/eras/' + n + '-' + w + '.webp')));
const PANO_ICONS = ["A01_rays-of-light", "A02_clouds-and-sky", "A03_green-sprout", "A04_sun", "A05_moon", "A06_fish-and-bird", "A07_lion", "A08_humanity", "A09_red-heart", "B01_cracked-heart", "B02_teardrop", "B03_breath-over-dust", "B04_forbidden-fruit-tree", "B05_garment-of-skins", "B06_altar-with-fire", "B07_noah-ark", "B08_ocean-waves", "B09_rainbow", "C01_brick-tower", "C02_two-speech-bubbles", "C03_globe", "C04_compass", "C05_desert-tent", "C06_gold-ring", "C07_ladder-of-light", "C08_scroll", "C09_praying-hands", "D01_iron-chain", "D02_golden-crown", "D03_burning-bush", "D04_harp", "D05_egyptian-pyramids", "D06_lightning-bolt", "D07_lamb", "D08_parted-sea", "D09_clay-jar", "E01_two-stone-tablets", "E02_tabernacle-tent", "E03_golden-calf", "E04_bronze-serpent-on-a-pole", "E05_city-walls", "E06_river-through-hills", "E07_balance-scales", "E08_strong-arm", "E09_oil-lamp", "F01_oil-flask", "F02_sailing-ship", "F03_two-divided-crowns", "F04_flame", "F05_fiery-chariot", "F06_burning-city", "F07_mountain", "F08_hourglass", "F09_ram-horn-trumpet", "G01_bricks-and-trowel", "G02_camel", "G03_shield", "G04_temple-with-columns", "G05_scroll-beside-a-tree", "G06_sheaf-of-wheat", "G07_stone", "G08_golden-star", "G09_golden-crown"];
PANO_ICONS.forEach(n => ['96', '192'].forEach(w => PANO_SAVE.push('./assets/panorama/icons/' + n + '-' + w + '.webp')));
const CORE = ['./', './index.html', './assets/art/registry.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
/* art library: read the registry and save each drawing's offline size in the background */
function saveLibraryArt() {
  return caches.open(CACHE).then(c => fetch('./assets/art/registry.js', {cache: 'no-cache'}).then(r => r.text()).then(t => {
    const reg = JSON.parse(t.slice(t.indexOf('=') + 1).trim().replace(/;$/, ''));
    return (reg.offline || []).reduce((p, u) => p.then(() => c.match('./' + u).then(hit => hit || c.add('./' + u).catch(() => null))), Promise.resolve());
  })).catch(() => null);
}
function savePanoArt() {
  return caches.open(CACHE).then(c => PANO_SAVE.reduce((p, u) => p.then(() => c.match(u).then(hit => hit || c.add(u).catch(() => null))), Promise.resolve()));
}
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { savePanoArt().then(saveLibraryArt); }));
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
    let servedSaved = false;
    const tag = r => r && (r.headers.get('etag') || r.headers.get('last-modified'));
    const net = fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(r => {
      if (!r || !r.ok) throw new Error('bad');
      const copy = r.clone();
      /* save the new page; if the app already opened the older saved copy, tell it a new version is ready */
      caches.open(CACHE).then(c => c.match('./index.html').then(old => {
        const changed = old && tag(old) && tag(copy) && tag(old) !== tag(copy);
        return c.put('./index.html', copy).then(() => {
          if (servedSaved && changed) self.clients.matchAll({type: 'window'}).then(cs => cs.forEach(cl => cl.postMessage({type: 'abide-update-ready'})));
        });
      }));
      return r;
    });
    const saved = () => caches.match(req).then(r => r || caches.match('./index.html'));
    e.waitUntil(net.catch(() => null));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done && r) { done = true; resolve(r); } };
      const timer = setTimeout(() => saved().then(r => { if (r && !done) servedSaved = true; finish(r); }), 3000);
      net.then(r => { clearTimeout(timer); finish(r); })
         .catch(() => { clearTimeout(timer); saved().then(r => r ? finish(r) : finish(fetch(req))); });
    }));
  } else if (/\/assets\/art\/[^?]+-\d+\.webp$/.test(req.url)) {
    /* library art: saved copy first; offline and this size not saved → any saved size of the same drawing */
    const base = req.url.replace(/-\d+\.webp$/, '-');
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n && n.ok) { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return n; })
      .catch(() => caches.open(CACHE).then(c => c.keys().then(ks => { const k = ks.find(q => q.url.indexOf(base) === 0 && /-\d+\.webp$/.test(q.url)); return k ? c.match(k) : Response.error(); })))));
  } else if (/\/assets\/panorama\/((eras\/era|hero)-\d\d-|icons\/[A-G]\d\d_)[a-z-]+-\d+\.webp$/.test(req.url)) {
    /* hero art: saved copy first; if this size is not saved and there is no internet, show another saved size of the same picture */
    const base = req.url.replace(/-\d+\.webp$/, '');
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n && n.ok) { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return n; })
      .catch(() => caches.match(base + '-960.webp').then(a => a || caches.match(base + '-480.webp')).then(a => a || caches.match(base + '-1600.webp')).then(a => a || caches.match(base + '-384.webp')).then(a => a || caches.match(base + '-192.webp')).then(a => a || caches.match(base + '-96.webp')).then(a => a || Response.error()))));
  } else {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return n; })));
  }
});
