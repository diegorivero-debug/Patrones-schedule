// ═══════════════════════════════════════════════════════════════════════════════
// Service Worker — Leadership Schedule Dashboard
// Strategy: stale-while-revalidate for all cached assets
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_NAME = 'SCHEDULE_CACHE_v1';

// Assets to precache on install
const PRECACHE_URLS = [
  './index.html',
  './dashboard.html',
  './auditor.html',
  './equipo.html',
  './vacaciones.html',
  './planificador-13w.html',
  './equity.html',
  './ajustes.html',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/kpis.js',
  './js/person-drill.js',
  './js/equity-tracker.js',
  './js/real-day.js',
  './js/command-palette.js',
  './js/pwa.js',
  './js/auditor.js',
  './js/team-registry.js',
  './js/vacaciones.js',
  './js/planificador.js',
  './js/equity.js',
  './js/calendar-2026.js',
  './patron_dia_normal.csv',
  './patron_martes_commercial.csv',
  './patron_miercoles_leadership.csv',
  './patron_sabado.csv',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest',
];

// ── Install: precache all static assets ─────────────────────────────────────
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache each URL individually so one failure doesn't block the rest
      return Promise.allSettled(
        PRECACHE_URLS.map(function(url) {
          return cache.add(url).catch(function() { /* ignore individual failures */ });
        })
      );
    })
  );
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: stale-while-revalidate ───────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN, etc.) and chrome-extension
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate: respond from cache immediately, update in background
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(request).then(function(cached) {
        var fetchPromise = fetch(request).then(function(response) {
          // Cache valid responses
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(function() {
          // Network unavailable — return whatever we have
          return cached || new Response('Offline', { status: 503 });
        });

        // Return cached version immediately (or wait for network if no cache)
        return cached || fetchPromise;
      });
    })
  );
});
