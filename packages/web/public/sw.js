// Versioned cache name — changes on each deployment to invalidate stale caches
const CACHE_NAME = 'salescoach-' + (self.__BUILD_VERSION || 'dev');

// Install event - skip waiting immediately to activate new SW
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - clean ALL old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('salescoach-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network only, no caching of HTML/JS assets
// This prevents stale chunk errors after deployment
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests — let them pass through
  if (event.request.url.includes('/api/')) return;

  // Network-only strategy: always fetch from network, never serve stale cache
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback: only serve cached index.html for navigation
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});

// Listen for skip-waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
