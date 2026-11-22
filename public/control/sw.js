const CACHE = 'mytuner-control-v73';
/* Loghi stazioni: cache permanente, sopravvive agli aggiornamenti di versione */
const LOGO_CACHE = 'mytuner-control-logos-v1';
const ASSETS = [
  './',
  './index.html',
  './css/control.css',
  './js/control.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-48.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE && k !== LOGO_CACHE).map((k) => caches.delete(k))
    ))
      .then(() => self.clients.claim())
  );
});

function isLogoRequest(req, url) {
  if (req.destination === 'image' && url.origin !== self.location.origin) return true;
  return url.origin === self.location.origin && /^\/(logo|logos)(\/|$)|^\/img\/logos?\//.test(url.pathname);
}

function logoCacheFirst(req) {
  return caches.open(LOGO_CACHE).then((cache) => cache.match(req).then((hit) => {
    if (hit) return hit;
    return fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
      return res;
    });
  }));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isLogoRequest(req, url)) {
    event.respondWith(logoCacheFirst(req));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
