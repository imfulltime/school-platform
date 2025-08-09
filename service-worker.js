// School Platform Service Worker
// Version 1.0.0

const CACHE_NAME = 'school-platform-v1';
const STATIC_CACHE = 'school-platform-static-v2';
const DYNAMIC_CACHE = 'school-platform-dynamic-v2';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/students.html',
  '/classes.html',
  '/grades.html',
  '/attendance.html',
  '/teacher-profile.html',
  '/auth.html',
  '/assets/css/styles.css',
  // removed legacy sync files
  '/manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for frequently updated content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Service Worker: Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Service Worker: Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Determine cache strategy based on request type
  // Network-first for HTML to always get latest UI
  let strategy = request.destination === 'document'
    ? CACHE_STRATEGIES.NETWORK_FIRST
    : CACHE_STRATEGIES.NETWORK_FIRST;
  
  if (STATIC_FILES.includes(url.pathname) || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'manifest') {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  } else if (url.pathname.includes('/api/') || 
             url.pathname.includes('.json')) {
    strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  event.respondWith(handleRequest(request, strategy));
});

// Handle different caching strategies
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);
    default:
      return networkFirst(request);
  }
}

// Cache first strategy - good for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Serving from cache (offline):', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network first strategy - good for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Service Worker: Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/index.html');
      return offlinePage || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Stale while revalidate - good for frequently updated content
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then(c => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have cache
    return cachedResponse;
  });
  
  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Handle background sync for data synchronization
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-school-data') {
    event.waitUntil(syncSchoolData());
  }
});

// Sync school data when online
async function syncSchoolData() {
  try {
    console.log('🔄 Service Worker: Syncing school data...');
    
    // Check if we have stored data to sync
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_DATA',
        message: 'Background sync triggered'
      });
    });
    
    console.log('✅ Service Worker: Data sync completed');
  } catch (error) {
    console.error('❌ Service Worker: Data sync failed:', error);
  }
}

// Handle push notifications (for future use)
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const title = data.title || 'School Platform';
  const options = {
    body: data.body || 'New notification',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/icon-72x72.png',
    tag: data.tag || 'school-notification',
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Check if the app is already open
        for (let client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    
    case 'CLEAR_CACHE':
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    
    default:
      console.log('🔔 Service Worker: Unknown message type:', type);
  }
});

console.log('🎉 Service Worker: Script loaded successfully');
