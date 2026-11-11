/* Service worker: lets the installed app open offline.
   App files are network-first (updates arrive as soon as you're online) with the cache as the offline fallback. */
const CACHE = 'perfect-play-c60bd0eb';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const save = (req, res) => {
  const copy = res.clone();
  caches.open(CACHE).then((c) => c.put(req, copy));
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => save(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
    );
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // Fonts never change: cache first.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
  }
});
