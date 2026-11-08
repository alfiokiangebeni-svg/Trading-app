/* Alerte Trading service worker: app shell offline, market data always from the network. */
const VERSION = 'at-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './css/sections.css', './js/calendar.js', './js/football.js',
  './js/academy-content.js', './js/academy.js', './js/lab.js', './js/replay.js', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Prices: never cached.
  if (/binance|coinbase|espn|faireconomy|githubusercontent/.test(url.hostname)) return;
  const sameOrigin = url.origin === self.location.origin;
  const isStatic = sameOrigin || /unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!isStatic) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    // Network first so updates show up, cache as offline fallback.
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  })));
});
