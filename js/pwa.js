// ═══════════════════════════════════════════════════════════════════════════════
// PWA — Service Worker registration + install prompt + online/offline indicator
// Note: Service Worker requires serving over HTTP(S).
// When opening files directly via file://, SW is silently skipped.
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Service Worker registration ──────────────────────────────────────────────
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(function (reg) {
          // Notify when a new SW is waiting (optional: prompt user to refresh)
          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new version is cached; you could show a toast here
                  console.log('[PWA] Nueva versión disponible — recarga para actualizar');
                }
              });
            }
          });
        })
        .catch(function (err) {
          console.warn('[PWA] SW registration failed:', err);
        });
    });
  }

  // ── Online / offline indicator ───────────────────────────────────────────────
  function updateOnlineIndicator(isOnline) {
    var indicator = document.getElementById('pwa-online-indicator');
    if (!indicator) return;
    indicator.className = 'pwa-online-dot ' + (isOnline ? 'pwa-online' : 'pwa-offline');
    indicator.title     = isOnline ? 'Online' : 'Offline';
    indicator.setAttribute('aria-label', isOnline ? 'Conectado' : 'Sin conexión');
  }

  window.addEventListener('online',  function () { updateOnlineIndicator(true);  });
  window.addEventListener('offline', function () { updateOnlineIndicator(false); });

  // ── Install prompt ───────────────────────────────────────────────────────────
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button(s) if present
    document.querySelectorAll('.pwa-install-btn').forEach(function (btn) {
      btn.style.display = '';
    });
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    // Hide install buttons once installed
    document.querySelectorAll('.pwa-install-btn').forEach(function (btn) {
      btn.style.display = 'none';
    });
  });

  // Called by the install button's onclick
  window.triggerPWAInstall = function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') {
        console.log('[PWA] App instalada');
      }
      deferredPrompt = null;
    });
  };

  // ── Inject indicator + install button into the header on DOMContentLoaded ────
  document.addEventListener('DOMContentLoaded', function () {
    injectOnlineIndicator();
    injectInstallButton();
  });

  function injectOnlineIndicator() {
    // Look for a header-actions or site-nav to attach the indicator
    var target = document.querySelector('.header-actions') ||
                 document.querySelector('.action-btns') ||
                 document.querySelector('header');
    if (!target) return;

    var dot = document.createElement('span');
    dot.id        = 'pwa-online-indicator';
    dot.className = 'pwa-online-dot ' + (navigator.onLine ? 'pwa-online' : 'pwa-offline');
    dot.title     = navigator.onLine ? 'Online' : 'Offline';
    dot.setAttribute('aria-label', navigator.onLine ? 'Conectado' : 'Sin conexión');

    // Prepend inside target
    target.insertBefore(dot, target.firstChild);
  }

  function injectInstallButton() {
    // Inject a hidden install button into the site-nav (visible only when installable)
    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    var btn = document.createElement('button');
    btn.className = 'pwa-install-btn nav-btn';
    btn.style.display = 'none';  // hidden until beforeinstallprompt fires
    btn.title = 'Instalar app en este dispositivo';
    btn.setAttribute('aria-label', 'Instalar app');
    btn.innerHTML = '📲 Instalar';
    btn.addEventListener('click', window.triggerPWAInstall);
    nav.appendChild(btn);
  }

})();
