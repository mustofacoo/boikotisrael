const CACHE_NAME = 'Boikot!';
const urlsToCache = [
  './',
  './index.html',
  './boycott-products.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/vue@3/dist/vue.global.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      // Take control of all pages
      return self.clients.claim();
    })
  );
});

// Fetch Strategy: Cache First with Network Fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests that are not same-origin
  if (!event.request.url.startsWith(self.location.origin)) {
    // Allow Vue.js CDN
    if (!event.request.url.includes('unpkg.com')) {
      return;
    }
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          
          // For JSON data, check for updates in background
          if (event.request.url.includes('boycott-products.json')) {
            // Background update for data freshness
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.ok) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                  });
                }
              })
              .catch(() => {
                // Network failed, cache is still valid
              });
          }
          
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if response is valid
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone response for caching
            const responseToCache = networkResponse.clone();

            // Add to cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error('Service Worker: Network fetch failed', error);
            
            // Return offline page or show offline message
            if (event.request.destination === 'document') {
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Offline - Boikot</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      background: #1a1a1a;
                      color: #ffffff;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      margin: 0;
                      text-align: center;
                      padding: 20px;
                    }
                    .container {
                      background: #2a2a2a;
                      border-radius: 16px;
                      padding: 48px;
                      max-width: 400px;
                    }
                    .icon { font-size: 48px; margin-bottom: 16px; }
                    .title { font-size: 24px; margin-bottom: 16px; }
                    .message { color: #888; line-height: 1.5; margin-bottom: 24px; }
                    .retry-btn {
                      background: #ffffff;
                      color: #1a1a1a;
                      border: none;
                      padding: 16px 24px;
                      border-radius: 12px;
                      cursor: pointer;
                      font-size: 16px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="icon">📱</div>
                    <h1 class="title">Aplikasi Offline</h1>
                    <p class="message">
                      Anda sedang offline. Aplikasi akan bekerja dengan data yang tersimpan di cache.
                    </p>
                    <button class="retry-btn" onclick="window.location.reload()">
                      Coba Lagi
                    </button>
                  </div>
                </body>
                </html>
              `, {
                headers: {
                  'Content-Type': 'text/html'
                }
              });
            }
            
            throw error;
          });
      })
  );
});

// Background Sync (for future features like offline form submissions)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      Promise.resolve()
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Received message', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Notification click handler (for future push notifications)
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Push notification handler (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Update produk boikot tersedia',
    icon: './icon-192.png',
    badge: './icon-72.png',
    tag: 'boikot-update',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Lihat Update'
      },
      {
        action: 'dismiss',
        title: 'Nanti'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Boikot App', options)
  );
});