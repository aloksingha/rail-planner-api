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
        // Look up the asset by its exact path (e.g. /index.html or /assets/index-xxx.js)
        return cache.match(path).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Cache HIT:', path);
            return cachedResponse;
          }
          
          // If not in cache, fallback to fetching from local server (packaged files in APK)
          return fetch(event.request).then((networkResponse) => {
            // Return network response directly
            return networkResponse;
          }).catch((err) => {
            // Offline fallback for main page navigation
            if (path === '/' || path === '/index.html') {
              return cache.match('/index.html');
            }
            throw err;
          });
        });
      })
    );
  }
});
