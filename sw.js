// Cache name is stamped with a Unix timestamp by `npm run predeploy`.
// Never edit this value by hand — run predeploy before pushing instead.
const CACHE = 'onesmallhoof-1775506355609';
const ASSETS = [
  './',
  './index.html',
  './style-v2.css',
  './lib.js',
  './script.js',
  './supabase-client.js',
  './auth.js',
  './sync.js',
  './manifest.json',
  './images/horseshoe-2.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
