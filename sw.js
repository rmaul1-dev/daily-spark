// Offline cache for Daily Spark. The app-shell cache name changes on every build so updates reach phones and iPads.
// Lessons live in a separate cache that survives app updates.
const CACHE = 'daily-spark-v7-bdf94c0e';
const CONTENT = 'daily-spark-content';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './content/index.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CONTENT).map(k => caches.delete(k)))).then(() => self.clients.claim())));
function put(name, req, res) { if (res && res.ok) { const copy = res.clone(); caches.open(name).then(c => c.put(req, copy)); } return res; }
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const key = url.origin + url.pathname;   // ignore ?day= and cache-busting params
  // the lesson list: network first so new packs appear, last copy when offline
  if (url.pathname.endsWith('/content/index.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(res => put(CONTENT, key, res)).catch(() => caches.match(key).then(r => r || caches.match('./content/index.json'))));
    return;
  }
  // packs: serve the saved copy instantly, refresh it in the background
  if (url.pathname.includes('/content/packs/')) {
    e.respondWith(caches.match(key).then(hit => {
      const net = fetch(e.request, { cache: 'no-store' }).then(res => put(CONTENT, key, res));
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    }));
    return;
  }
  // pages: network first (so a new version shows up), cached copy when offline
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(fetch(e.request).then(res => put(CACHE, './index.html', res)).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => put(CACHE, e.request, res))));
});
