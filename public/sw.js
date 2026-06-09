const CACHE_NAME = 'iamobil-v1';
const DB_NAME = 'iamobil';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('properties')) {
        db.createObjectStore('properties', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromDB(storeName) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  });
}

function getFromDB(storeName, key) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  });
}

// Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // API requests: network first, fallback to cache, then IndexedDB
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Fallback to IndexedDB
            if (url.pathname === '/api/partner/properties' && url.searchParams.has('login')) {
              return getAllFromDB('properties').then(properties => {
                const body = JSON.stringify({ success: true, count: properties.length, properties });
                return new Response(body, {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });
              }).catch(() => new Response(JSON.stringify({ success: false, error: 'offline' }), { status: 503 }));
            }
            if (url.pathname === '/api/partner/register' && url.searchParams.has('login')) {
              const login = url.searchParams.get('login');
              return getFromDB('profile', login).then(profile => {
                const body = JSON.stringify({ success: true, broker: profile || { login } });
                return new Response(body, {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });
              }).catch(() => new Response(JSON.stringify({ success: false, error: 'offline' }), { status: 503 }));
            }
            return new Response(JSON.stringify({ success: false, error: 'offline' }), { status: 503 });
          });
        })
    );
    return;
  }

  // Static assets: cache first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }))
    );
    return;
  }
});

// Push
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'IAmobil', body: 'Nova atualização' };
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
