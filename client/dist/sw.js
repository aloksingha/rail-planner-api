// Tickets Pro Service Worker - Hot Cache Engine v4
const CACHE_NAME = 'tickets-pro-hot-cache';

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Deleting stale cache:', key);
          return caches.delete(key);
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
      // 1. Navigation requests: serve cached index.html if available
      if (
        event.request.mode === 'navigate' ||
        (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))
      ) {
        return cache.match('/index.html').then((indexResponse) => {
          if (indexResponse) {
            console.log('[SW] Serving cached index.html for navigation:', path);
            return indexResponse;
          }
          return cache.match('/').then((rootResponse) => {
            if (rootResponse) {
              console.log('[SW] Serving cached / for navigation:', path);
              return rootResponse;
            }
            return fetch(event.request).catch(() => cache.match('/index.html'));
          });
        });
      }

      // 2. Look up the asset by request (native matching) or path fallback
      return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return cache.match(path, { ignoreSearch: true }).then((cachedResponseByPath) => {
          if (cachedResponseByPath) {
            return cachedResponseByPath;
          }

          // 3. Fallback to local server / network (packaged files in APK)
          return fetch(event.request).catch((err) => {
            if (path === '/' || path === '/index.html') {
              return cache.match('/index.html');
            }
            throw err;
          });
        });
      });
    })
  );
});
