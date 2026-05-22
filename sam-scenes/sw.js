// Sam Scenes — Service Worker
// Стратегия: Network-first для index.html (всегда свежий), Cache-first для остальных файлов

var CACHE_NAME = 'samscenes-v308';
var CORE_FILES = [
  '/abakan-script/sam-scenes/',
  '/abakan-script/sam-scenes/index.html',
  '/abakan-script/sam-scenes/manifest.json',
  '/abakan-script/sam-scenes/apple-touch-icon.png',
  '/abakan-script/sam-scenes/favicon-192.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_FILES).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  if (e.request.headers.get('accept') && e.request.headers.get('accept').indexOf('text/html') !== -1) {
    e.respondWith(
      fetch(e.request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
          return response;
        })
        .catch(function () {
          return caches.match(e.request).then(function (cached) {
            return cached || caches.match('/abakan-script/sam-scenes/index.html');
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
        return response;
      }).catch(function () { return new Response('', { status: 408 }); });
    })
  );
});
