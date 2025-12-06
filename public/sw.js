// Service Worker для PWA
const CACHE_NAME = 'pixel-palace-v4'; // Обновлено для исправления обработки API запросов
const urlsToCache = [
  '/',
  '/index.html',
  '/src/global.css',
  '/manifest.json',
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
      ).then(() => {
        // Claim all clients to ensure the new service worker takes control immediately
        return self.clients.claim();
      });
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Пропускаем API запросы - они всегда должны идти в сеть
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Пропускаем запросы к Vite dev server (HMR)
  if (event.request.url.includes('/@vite/client') || 
      event.request.url.includes('/@react-refresh') ||
      event.request.url.includes('/@vite/') ||
      event.request.url.includes('?t=') ||
      event.request.url.includes('&t=') ||
      event.request.url.includes('/src/') ||
      event.request.url.includes('/node_modules/')) {
    return;
  }
  
  // Пропускаем запросы, которые не являются GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Пропускаем запросы к внешним ресурсам (не с того же origin)
  if (url.origin !== location.origin) {
    return;
  }
  
  // Пропускаем запросы к WebSocket и другим не-HTTP протоколам
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // В dev режиме пропускаем больше запросов (динамические ресурсы Vite)
  // Определяем dev режим по наличию специфичных путей
  const isDevMode = event.request.url.includes('localhost') || 
                    event.request.url.includes('127.0.0.1') ||
                    url.pathname.startsWith('/src/');
  
  if (isDevMode && !url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }
        
        // Пытаемся сделать сетевой запрос
        return fetch(event.request)
          .then((networkResponse) => {
            // Проверяем, что ответ валидный
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              // Если ответ невалидный, не кэшируем и просто возвращаем
              return networkResponse;
            }
            
            // Клонируем ответ для кэширования
            const responseToCache = networkResponse.clone();
            
            // Кэшируем только успешные ответы для статических ресурсов
            if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  // Игнорируем ошибки кэширования
                  console.warn('Failed to cache resource:', event.request.url, error);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            // Логируем ошибку для отладки
            console.error('[SW] Fetch failed:', event.request.url, error);
            // Если сетевой запрос не удался, возвращаем пустой ответ
            // Это предотвращает uncaught promise rejection
            // Для HTML запросов можно вернуть кэшированную версию index.html
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Для других запросов возвращаем пустой ответ с соответствующим статусом
            return new Response('', {
              status: 408,
              statusText: 'Request Timeout',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
      .catch((error) => {
        // Логируем ошибку для отладки
        console.error('[SW] Cache and fetch failed:', event.request.url, error);
        // Если и кэш, и сеть не сработали, возвращаем fallback
        // Для навигационных запросов возвращаем index.html из кэша
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        // Для других запросов возвращаем пустой ответ
        return new Response('', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Обработка сообщений для очистки кэшей
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_OLD_CACHES') {
    const respond = (data) => {
      // Если сообщение отправлено через MessageChannel, отвечаем через порт
      if (event.ports && event.ports[0]) {
        try {
          event.ports[0].postMessage(data);
        } catch (error) {
          // Логируем ошибку при отправке ответа
          console.warn('[SW] Failed to post message to port:', error);
        }
      }
    };

    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Old caches cleared');
      respond({ success: true });
    }).catch((error) => {
      console.error('❌ Error clearing caches:', error);
      respond({ success: false, error: error.message });
    });
  }
});

