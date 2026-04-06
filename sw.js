const CACHE = 'onesmallhoof-v6';
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
