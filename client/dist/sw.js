const CACHE_NAME = 'tickets-pro-hot-cache';

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept requests for our own origin (same domain/scheme)
  if (url.origin === self.location.origin) {
    const path = url.pathname;
    
    // Ignore api requests, razorpay, chrome extensions, etc.
    if (path.startsWith('/api') || path.startsWith('/health')) {
      return;
    }

    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        // 1. If it's a navigation request, serve index.html
        if (event.request.mode === 'navigate' || 
            (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'))) {
          return cache.match('/index.html').then((indexResponse) => {
            if (indexResponse) {
              console.log('[SW] Serving index.html for navigation:', path);
              return indexResponse;
            }
            return fetch(event.request);
          });
        }

        // 2. Look up the asset by request (native matching) or path fallback
        return cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Cache HIT (request):', path);
            return cachedResponse;
          }
          
          return cache.match(path).then((cachedResponseByPath) => {
            if (cachedResponseByPath) {
              console.log('[SW] Cache HIT (path fallback):', path);
              return cachedResponseByPath;
            }
            
            // 3. Fallback to fetching from local server (packaged files in APK)
            return fetch(event.request).then((networkResponse) => {
              return networkResponse;
            }).catch((err) => {
              // Offline fallback for assets
              if (path === '/' || path === '/index.html') {
                return cache.match('/index.html');
              }
              throw err;
            });
          });
        });
      })
    );
  }
});
