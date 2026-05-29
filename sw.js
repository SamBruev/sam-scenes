// Sam Scenes — Service Worker
// Стратегия: Network-first с тайм-аутом для index.html (свежий, но без зависания
// на медленной сети), Cache-first для остальных файлов — приложение работает офлайн.

var CACHE_NAME = 'samscenes-v319';
var CORE_FILES = [
  '/sam-scenes/',
  '/sam-scenes/index.html',
  '/sam-scenes/manifest.json',
  '/sam-scenes/apple-touch-icon.png',
  '/sam-scenes/favicon-192.png'
];

// #13: на медленной сети не ждём ответ дольше этого времени — отдаём кэш, открытие плавное.
var HTML_NETWORK_TIMEOUT_MS = 2500;

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

  var req = e.request;

  if (req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') !== -1) {
    // #13: network-first, но с тайм-аутом. Сеть нужна только при открытии/обновлении;
    // если она медленная или недоступна — мгновенно отдаём закэшированную версию.
    e.respondWith(
      new Promise(function (resolve) {
        var settled = false;

        function fromCache() {
          return caches.match(req).then(function (cached) {
            return cached || caches.match('/sam-scenes/index.html');
          });
        }

        var timer = setTimeout(function () {
          if (settled) return;
          settled = true;
          fromCache().then(function (cached) {
            resolve(cached || fetch(req));
          });
        }, HTML_NETWORK_TIMEOUT_MS);

        fetch(req)
          .then(function (response) {
            // Кэш обновляем всегда — даже если по тайм-ауту уже отдали старую версию.
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, clone);
            });
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(response);
          })
          .catch(function () {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fromCache().then(function (cached) {
              resolve(cached || new Response('', { status: 408 }));
            });
          });
      })
    );
    return;
  }

  // Остальные файлы (скрипты, картинки, шрифты, манифест) — cache-first: офлайн без сети.
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        return response;
      }).catch(function () { return new Response('', { status: 408 }); });
    })
  );
});
