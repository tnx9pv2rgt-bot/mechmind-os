/**
 * Service Worker Kill Switch
 * Immediately unregisters itself to clear any stale caches
 * 2026 Best Practice: No Service Worker for Next.js App Router
 */

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.matchAll({type: 'window'});
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.navigate(client.url);
      });
      return self.registration.unregister();
    })
  );
});

// Pass-through for any remaining fetch events (shouldn't happen)
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
