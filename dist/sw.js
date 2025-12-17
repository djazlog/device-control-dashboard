// Service Worker для Device Management Dashboard
// Минимальный Service Worker без кэширования
// Используется только для регистрации PWA - все запросы идут напрямую в сеть

// Установка Service Worker
self.addEventListener('install', (event) => {
  // Принудительно активируем новый Service Worker сразу
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  // Берем контроль над всеми клиентами сразу
  event.waitUntil(self.clients.claim());
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Игнорируем запросы к Vite dev server (localhost:5173 или /@vite)
  if (url.hostname === 'localhost' && url.port === '5173') {
    return; // Пропускаем запрос к dev серверу
  }
  if (url.pathname.startsWith('/@vite')) {
    return; // Пропускаем запросы к Vite HMR
  }

  // Пропускаем все API запросы и WebSocket - они должны идти напрямую в сеть
  if (url.pathname.startsWith('/ws') || 
      url.pathname.startsWith('/api') ||
      url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/devices') ||
      url.pathname.startsWith('/grpc')) {
    return; // Не перехватываем API запросы
  }

  // Для всех остальных запросов просто используем сеть без кэширования
  // Это гарантирует, что всегда загружаются свежие версии файлов
  event.respondWith(fetch(request));
});

