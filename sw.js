// Guarda la app en el iPhone para que funcione sin internet.
const CACHE = 'rutina-v2.0.1';
const FILES = [
  './', './index.html', './styles.css', './app.js', './parser.js', './assets.js', './manifest.webmanifest',
  './fonts/archivo.woff2', './fonts/plexmono-500.woff2', './fonts/plexmono-600.woff2',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero lo guardado (instantáneo y offline); si hay internet, se actualiza en segundo plano.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || c.match('./index.html');
  }));
});
