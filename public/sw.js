// Service Worker для Device Management Dashboard
const CACHE_NAME = 'device-dashboard-v1';
const urlsToCache = [
  '/',
  '/src/main.js',
  '/src/App.vue',
  '/src/views/Dashboard.vue',
  '/src/components/DeviceList.vue',
  '/src/components/DeviceTerminal.vue',
  '/src/components/ConnectionStatus.vue',
  '/src/components/DeviceDetails.vue'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Не перехватываем gRPC запросы
  if (url.pathname.startsWith('/device.DeviceService') || url.pathname.startsWith('/grpc')) {
    return; // пропускаем, чтобы шло напрямую в сеть
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request);
    })
  );
});

// Обработка push уведомлений (для будущих функций)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
