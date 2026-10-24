// Tickets Pro Service Worker - Hot Cache Engine v6 (Network-First Resilient)
const CACHE_NAME = 'tickets-pro-hot-cache';

self.addEventListener('install', (event) => {
  console.log('[SW v6] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v6] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v6] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept requests for our own origin (same domain/scheme)
  if (url.origin !== self.location.origin) {
    return;
  }

  const path = url.pathname;

  // Never intercept API requests, health check, sw.js, or manifest.json
  if (
    path.startsWith('/api') ||
    path.startsWith('/health') ||
    path === '/sw.js' ||
    path === '/manifest.json'
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // 1. Navigation requests (HTML): Network-First with cache fallback
      if (
        event.request.mode === 'navigate' ||
        (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))
      ) {
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put('/index.html', networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cache.match('/index.html'));
      }

      // 2. JS and CSS assets: Network-First so updates reflect immediately, fallback to cache
      if (path.endsWith('.js') || path.endsWith('.css')) {
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cache.match(event.request, { ignoreSearch: true }));
      }

      // 3. Static assets (images, fonts, etc.): Cache-First with network fallback
      return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            if (path === '/' || path === '/index.html') {
              return cache.match('/index.html');
            }
            throw err;
          });
      });
    })
  );
});
