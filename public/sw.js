const CACHE_NAME = 'iamobil-v1';

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

// Fetch: only cache static assets, always go to network for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: always network, no cache
  if (url.pathname.startsWith('/api/')) {
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
