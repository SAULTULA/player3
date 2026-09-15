/* ==================================================================
   RADIO GRACIA Y PAZ — Service Worker
   Cachea archivos base. El stream de audio SIEMPRE va por red.
   v2 — Bump de versión para forzar actualización de caché (fix botón instalar)
   ================================================================== */

const CACHE_NAME = 'graciaypaz-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/pwa.js',
  './image/logo.png',
  './image/icon-192.png',
  './image/icon-512.png',
  './image/ksm.png'
];

// -------- INSTALL --------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// -------- ACTIVATE --------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// -------- FETCH --------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Stream, Zeno API, iTunes, WhatsApp y KSM → siempre red, sin caché
  if (
    url.hostname.includes('zeno.fm') ||
    url.hostname.includes('itunes.apple.com') ||
    url.hostname.includes('wa.me') ||
    url.hostname.includes('ksmservicios') ||
    event.request.destination === 'audio'
  ) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Archivos locales
  if (url.origin === self.location.origin) {
    const isHTML =
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/');

    if (isHTML) {
      // HTML: red primero, fallback a caché
      event.respondWith(
        fetch(event.request)
          .then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
            return response;
          })
          .catch(() =>
            caches.match(event.request).then(c => c || caches.match('./index.html'))
          )
      );
      return;
    }

    // Assets: caché primero
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Otros externos
  event.respondWith(
    fetch(event.request).catch(() => new Response('', { status: 503 }))
  );
});