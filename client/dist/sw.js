// Self-unregistering Service Worker to ensure web clients always access live Firebase Hosting CDN
self.addEventListener('install', (event) => {
  console.log('[SW] Decommissioning service worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Purging all caches and unregistering...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW] Deleting stale cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Do not intercept fetch requests — let browser go directly to CDN
