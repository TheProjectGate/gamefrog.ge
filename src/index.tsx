import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import './i18n/config'; // Инициализация i18n
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { syncDocumentPlatformState } from './platform';
import { PlatformProvider } from './context/PlatformContext';

// Глобальные обработчики ошибок для отладки
window.addEventListener('error', () => {});

window.addEventListener('unhandledrejection', (event) => {
  // Предотвращаем вывод ошибки в консоль браузера по умолчанию
  // но мы уже залогировали её выше
  event.preventDefault();
});

// Устанавливаем начальный язык из localStorage
const savedLanguage = localStorage.getItem('i18nextLng');
if (savedLanguage === 'en' || savedLanguage === 'ka') {
  document.documentElement.lang = savedLanguage;
} else {
  document.documentElement.lang = 'en';
}

syncDocumentPlatformState();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Безопасная отправка сообщений в Service Worker
const safePostMessage = (registration: ServiceWorkerRegistration, message: any) => {
  try {
    // Проверяем, что service worker активен
    if (registration.active) {
      // Используем MessageChannel для безопасной отправки сообщений
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        // Сообщение получено, порт можно закрыть
        messageChannel.port1.close();
      };
      
      messageChannel.port1.onmessageerror = () => {
        // Ошибка при получении сообщения - просто закрываем порт
        messageChannel.port1.close();
      };
      
      // Отправляем сообщение с портом
      registration.active.postMessage(message, [messageChannel.port2]);
    } else if (registration.installing) {
      // Если service worker еще устанавливается, ждем его активации
      registration.installing.addEventListener('statechange', () => {
        if (registration.active) {
          safePostMessage(registration, message);
        }
      });
    } else if (registration.waiting) {
      // Если service worker ожидает активации, отправляем сообщение
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = () => messageChannel.port1.close();
      messageChannel.port1.onmessageerror = () => messageChannel.port1.close();
      registration.waiting.postMessage(message, [messageChannel.port2]);
    }
  } catch (error) {
    // Игнорируем ошибки при отправке сообщений (например, если контекст недействителен)
    // Это предотвращает появление runtime.lastError в консоли
    if (error instanceof Error && !error.message.includes('closed')) {
      // Подавляем вывод предупреждений, чтобы не засорять консоль
    }
  }
};

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // В режиме разработки всегда очищаем старые service workers и кэши
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        // Удаляем все старые регистрации
        return Promise.all(
          registrations.map((registration) => {
            registration.unregister();
            // Очищаем все кэши для этого service worker
            return caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
              );
            });
          })
        );
      }).then(() => {
        // Регистрируем новый service worker после очистки
        return navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      }).then((registration) => {
        // Принудительно обновляем service worker
        registration.update();
        // Очищаем старые кэши после регистрации (с безопасной отправкой сообщения)
        safePostMessage(registration, { type: 'CLEAR_OLD_CACHES' });
      }).catch((registrationError) => {
        // Ошибки регистрации SW игнорируем в консоли
      });
    } else {
      // В production регистрируем нормально
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          registration.update();
        })
        .catch((registrationError) => {
          // Ошибки регистрации SW игнорируем в консоли
        });
    }
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <PlatformProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </PlatformProvider>
  </React.StrictMode>
);
