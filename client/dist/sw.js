// Tickets Pro Service Worker - Hot Cache Engine v5 (Auto-Purge & Network-First)
const CACHE_NAME = 'tickets-pro-cache-v5';

self.addEventListener('install', (event) => {
  console.log('[SW v5] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW v5] Service Worker activating and purging stale caches...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v5] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept requests for our own origin
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
      // 1. Navigation requests: Network-First with cache fallback
      if (
        event.request.mode === 'navigate' ||
        (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))
      ) {
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            cache.put('/index.html', clone);
            cache.put('/', networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          return cache.match('/index.html');
        });
      }

      // 2. Asset requests: Network-First for JS and CSS so updates reflect immediately!
      if (path.endsWith('.js') || path.endsWith('.css')) {
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          return cache.match(event.request, { ignoreSearch: true });
        });
      }

      // 3. Media & static assets: Cache first with network fallback
      return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          if (path === '/' || path === '/index.html') {
            return cache.match('/index.html');
          }
          throw err;
        });
      });
    })
  );
});
