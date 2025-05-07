const CACHE_NAME = 'field-inspection-cache-v2'; // Increment version to force update
const urlsToCache = [
  '/', // Or '/index-worker.html' if that's your explicit start_url
  '/index-worker.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' // Cache Supabase library
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
  if (event.request.url.includes(SUPABASE_URL_FROM_APP_JS_CONFIG) || // You might need to expose SUPABASE_URL here
      event.request.url.includes('/rest/v1/') ||
      event.request.url.includes('/functions/v1/') ||
      event.request.url.includes('/storage/v1/')) {
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

// Placeholder for SUPABASE_URL. This is tricky as SW doesn't have direct access to JS variables from app.js
// For a robust solution, you'd pass this via postMessage or hardcode if it never changes.
// For simplicity now, we'll rely on the path checks above.
// const SUPABASE_URL_FROM_APP_JS_CONFIG = 'YOUR_SUPABASE_URL'; // Replace if needed for explicit exclusion