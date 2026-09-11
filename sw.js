/**
 * Offline app shell.
 *
 * Cache-first for the files the game needs to boot, with a network refresh in
 * the background. Any request that is not a same-origin GET is passed straight
 * through.
 */
const CACHE = 'gridshift-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './styles/gridshift.css',
  './src/main.js',
  './src/stats.js',
  './src/engine/game.js',
  './src/engine/grid.js',
  './src/engine/rng.js',
  './src/engine/index.js',
  './src/ui/renderer.js',
  './src/ui/announcer.js',
  './src/ui/input.js',
  './src/ui/storage.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
