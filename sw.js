const CACHE = 'onesmallhoof-v7';
const ASSETS = [
  './',
  './index.html',
  './style-v2.css',
  './lib.js',
  './script.js',
  './ui-helpers.js',
  './date-display.js',
  './streak-display.js',
  './share-card.js',
  './eco-actions.js',
  './count-tracker.js',
  './custom-tasks.js',
  './notifications.js',
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
