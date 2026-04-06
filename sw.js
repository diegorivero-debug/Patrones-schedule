const CACHE_NAME = 'ls-cache-v1';

const CACHE_URLS = [
  '/Patrones-schedule/',
  '/Patrones-schedule/index.html',
  '/Patrones-schedule/dashboard.html',
  '/Patrones-schedule/equipo.html',
  '/Patrones-schedule/vacaciones.html',
  '/Patrones-schedule/planificador-13w.html',
  '/Patrones-schedule/auditor.html',
  '/Patrones-schedule/equity.html',
  '/Patrones-schedule/ajustes.html',
  '/Patrones-schedule/offline.html',
  '/Patrones-schedule/manifest.json',
  '/Patrones-schedule/css/styles.css',
  '/Patrones-schedule/css/index.css',
  '/Patrones-schedule/css/ajustes.css',
  '/Patrones-schedule/css/auditor.css',
  '/Patrones-schedule/css/equity.css',
  '/Patrones-schedule/css/planificador.css',
  '/Patrones-schedule/css/vacaciones.css',
  '/Patrones-schedule/js/config.js',
  '/Patrones-schedule/js/app.js',
  '/Patrones-schedule/js/auditor.js',
  '/Patrones-schedule/js/equity.js',
  '/Patrones-schedule/js/planificador.js',
  '/Patrones-schedule/js/team-registry.js',
  '/Patrones-schedule/js/vacaciones.js',
  '/Patrones-schedule/patron_dia_normal.csv',
  '/Patrones-schedule/patron_martes_commercial.csv',
  '/Patrones-schedule/patron_miercoles_leadership.csv',
  '/Patrones-schedule/patron_sabado.csv',
  '/Patrones-schedule/icons/icon.svg',
  '/Patrones-schedule/icons/icon-192.png',
  '/Patrones-schedule/icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        // Do not cache opaque (cross-origin) responses to avoid storing error
        // responses from CDN resources (e.g. SheetJS). They are served from
        // the CDN directly and will be re-fetched on each load.
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function () {
        if (event.request.mode === 'navigate') {
          return caches.match('/Patrones-schedule/offline.html');
        }
      });
    })
  );
});
