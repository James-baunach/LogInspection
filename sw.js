const CACHE_NAME = 'field-inspection-cache-v7'; // Increment version if you make changes to cached files
const urlsToCache = [
  './', // Represents the root of your deployment relative to sw.js
  './index-worker.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png', // Assuming icon.png is in the root with sw.js
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install: Cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'}))); // Force reload from network
      })
      .catch(err => console.error("Cache open/addAll failed:", err))
  );
  self.skipWaiting(); // Activate worker immediately
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of pages immediately
});

// Fetch: Serve from cache first for core assets, network for others (like API calls)
self.addEventListener('fetch', event => {
  // Let browser handle Supabase API calls, function calls, and storage interactions directly
  if (event.request.url.includes('/rest/v1/') ||
      event.request.url.includes('/functions/v1/') ||
      event.request.url.includes('/storage/v1/') ||
      event.request.url.includes(new URL(self.registration.scope).origin + '/auth/v1') // Catch auth calls too
     ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Check if we received a valid response (basic type, 200 status)
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response to cache it
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
            console.warn("Fetch failed; returning offline fallback or error.", error);
            // Optionally, return a generic offline page if one exists and is cached
            // return caches.match('/offline.html');
        });
      })
  );
});
