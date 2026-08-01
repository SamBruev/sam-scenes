// Sam Scenes — Service Worker
// Стратегия: Network-first с тайм-аутом для index.html (свежий, но без зависания
// на медленной сети), Cache-first для остальных файлов — приложение работает офлайн.

var CACHE_NAME = 'samscenes-v411';
var CORE_FILES = [
  '/sam-scenes/',
  '/sam-scenes/index.html',
  '/sam-scenes/manifest.json',
  '/sam-scenes/build-info.json',
  '/sam-scenes/apple-touch-icon.png',
  '/sam-scenes/favicon-192.png',
  '/sam-scenes/icon-512.png',
  '/sam-scenes/icon-512-maskable.png',
  '/sam-scenes/top-lamp-bg.png',
  '/sam-scenes/top-logo.png',
  '/sam-scenes/brand-logo.png',
  '/sam-scenes/media/symbol-lamp.svg',
  // #2+#6 (аудит v401): локальные шрифты в прекэше — фирменный вид с первого офлайн-старта.
  '/sam-scenes/fonts/roboto-slab-cyrillic-wght-normal.woff2',
  '/sam-scenes/fonts/roboto-slab-latin-wght-normal.woff2',
  '/sam-scenes/fonts/pacifico-cyrillic-400-normal.woff2',
  '/sam-scenes/fonts/pacifico-latin-400-normal.woff2',
  '/sam-scenes/fonts/bad-script-cyrillic-400-normal.woff2',
  '/sam-scenes/fonts/bad-script-latin-400-normal.woff2'
];

// #13: на медленной сети не ждём ответ дольше этого времени — отдаём кэш, открытие плавное.
var HTML_NETWORK_TIMEOUT_MS = 2500;

// v411-review: критичные файлы кэшируем строго — их сбой роняет install, и SW честно
// попробует снова при следующем визите (раньше .catch молча «съедал» провал addAll,
// а addAll — «всё или ничего»: один флаки-запрос оставлял пустым весь прекэш).
// Остальное — поштучно с допуском отказа: один упавший файл не рушит офлайн-ядро.
var CORE_CRITICAL = [
  '/sam-scenes/',
  '/sam-scenes/index.html'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_CRITICAL).then(function () {
        return Promise.all(
          CORE_FILES
            .filter(function (u) { return CORE_CRITICAL.indexOf(u) === -1; })
            .map(function (u) { return cache.add(u).catch(function () {}); })
        );
      });
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
            // v411-review: но только успешный ответ (200) — иначе можно «запинить»
            // страницу ошибки в офлайн-кэше; asset-ветка ниже такой guard уже имела.
            if (response && response.status === 200) {
              var clone = response.clone();
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(req, clone);
              });
            }
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

  // #5-fix: остальные файлы (скрипты, картинки, шрифты, манифест) — stale-while-revalidate.
  // Мгновенно отдаём кэш (офлайн-плавность), а в фоне тянем свежую версию и обновляем кэш,
  // чтобы новые ассеты с тем же именем подтягивались без обязательного бампа CACHE_NAME.
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        }
        return response;
      }).catch(function () { return cached || new Response('', { status: 408 }); });
      return cached || network;
    })
  );
});
