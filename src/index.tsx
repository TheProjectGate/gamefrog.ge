import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import './i18n/config'; // Инициализация i18n
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { syncDocumentPlatformState } from './platform';
import { PlatformProvider } from './context/PlatformContext';

// Глобальные обработчики ошибок для отладки
// #region agent log
window.addEventListener('error', (event) => {
  fetch('http://localhost:7242/ingest/04afa4d2-4a28-4bcf-84e2-bdd38c7279ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:11',message:'Global error caught',data:{message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno,error:event.error?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
});
// #endregion

// #region agent log
window.addEventListener('unhandledrejection', (event) => {
  fetch('http://localhost:7242/ingest/04afa4d2-4a28-4bcf-84e2-bdd38c7279ae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:17',message:'Unhandled promise rejection',data:{reason:event.reason?.toString(),stack:event.reason?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // Предотвращаем вывод ошибки в консоль браузера по умолчанию
  // но мы уже залогировали её выше
  event.preventDefault();
});
// #endregion

// Устанавливаем начальный язык из localStorage
const savedLanguage = localStorage.getItem('i18nextLng');
if (savedLanguage === 'en' || savedLanguage === 'ka') {
  document.documentElement.lang = savedLanguage;
} else {
  document.documentElement.lang = 'en';
}

syncDocumentPlatformState();

// Fix browser-injected form fields that lack id/name attributes
// This handles fields created by password managers and autofill features
if (typeof window !== 'undefined') {
  const fixBrowserInjectedFields = () => {
    // Find all input fields that have tabindex="-1" and aria-disabled="true" but no id or name
    const inputs = document.querySelectorAll('input[tabindex="-1"][aria-disabled="true"]:not([id]):not([name])');
    inputs.forEach((input, index) => {
      const htmlInput = input as HTMLInputElement;
      if (!htmlInput.id && !htmlInput.name) {
        // Add both id and name attributes
        htmlInput.id = `browser-autofill-field-${index}`;
        htmlInput.name = `browser-autofill-field-${index}`;
      }
    });
  };

  // Run immediately and also after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixBrowserInjectedFields);
  } else {
    fixBrowserInjectedFields();
  }

  // Also run after a short delay to catch fields injected later by password managers
  setTimeout(fixBrowserInjectedFields, 500);
  setTimeout(fixBrowserInjectedFields, 1000);
  setTimeout(fixBrowserInjectedFields, 2000);

  // Use MutationObserver to catch fields added dynamically
  const observer = new MutationObserver(() => {
    fixBrowserInjectedFields();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

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
