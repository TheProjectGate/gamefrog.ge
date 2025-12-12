import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon } from './Icons';

interface ErrorLog {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'unhandledRejection' | 'react';
  message: string;
  stack?: string;
  source?: string;
  details?: any;
}

const ERROR_STORAGE_KEY = 'gf_error_logs';
const MAX_ERRORS = 100;

export const errorLogger = {
  errors: [] as ErrorLog[],
  isLogging: false, // Флаг для предотвращения рекурсии
  
  init() {
    // Загружаем сохраненные ошибки
    try {
      const saved = localStorage.getItem(ERROR_STORAGE_KEY);
      if (saved) {
        this.errors = JSON.parse(saved);
      }
    } catch (e) {
      // Используем оригинальный console.warn, чтобы избежать рекурсии
      const originalWarn = console.warn;
      originalWarn('Failed to load error logs from localStorage:', e);
    }

    // Перехватываем console.error и console.warn (только в режиме разработки)
    // Глобальные обработчики window.addEventListener устанавливаются в index.tsx
    if (import.meta.env.DEV) {
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        originalConsoleError.apply(console, args);
        if (this.isLogging) return; // Предотвращаем рекурсию
        const message = args.map(arg => {
          if (arg instanceof Error) {
            return arg.message;
          }
          return String(arg);
        }).join(' ');
        this.log({
          type: 'error',
          message,
          details: { args: args.map(a => String(a)) },
        });
      };

      // Перехватываем console.warn (только в режиме разработки)
      const originalConsoleWarn = console.warn;
      console.warn = (...args: any[]) => {
        originalConsoleWarn.apply(console, args);
        if (this.isLogging) return; // Предотвращаем рекурсию
        const message = args.map(arg => {
          if (arg instanceof Error) {
            return arg.message;
          }
          return String(arg);
        }).join(' ');
        this.log({
          type: 'warning',
          message,
          details: { args: args.map(a => String(a)) },
        });
      };
    }
  },

  log(error: Omit<ErrorLog, 'id' | 'timestamp'>) {
    // Предотвращаем рекурсию
    if (this.isLogging) return;
    this.isLogging = true;
    
    try {
      const errorLog: ErrorLog = {
        ...error,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      this.errors.unshift(errorLog);
      
      // Ограничиваем количество ошибок
      if (this.errors.length > MAX_ERRORS) {
        this.errors = this.errors.slice(0, MAX_ERRORS);
      }

      // Сохраняем в localStorage
      try {
        localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errors));
      } catch (e) {
        // Используем оригинальный console.warn
        const originalWarn = console.warn;
        originalWarn('Failed to save error logs to localStorage:', e);
      }

      // Выводим в консоль для разработки (используем оригинальные методы)
      if (import.meta.env.DEV) {
        const originalGroup = console.group;
        const originalGroupEnd = console.groupEnd;
        const originalError = console.error;
        
        originalGroup(`🚨 ${error.type.toUpperCase()}: ${error.message}`);
        if (error.stack) originalError('Stack:', error.stack);
        if (error.source) originalError('Source:', error.source);
        if (error.details) originalError('Details:', error.details);
        originalGroupEnd();
      }
    } finally {
      this.isLogging = false;
    }
  },

  clear() {
    this.errors = [];
    try {
      localStorage.removeItem(ERROR_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear error logs from localStorage:', e);
    }
  },

  getErrors() {
    return [...this.errors];
  },
};

const ErrorLogger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<ErrorLog[]>([]);

  const loadErrors = useCallback(() => {
    setErrors(errorLogger.getErrors());
  }, []);

  useEffect(() => {
    // Инициализируем logger при монтировании
    errorLogger.init();
    loadErrors();

    // Обновляем список ошибок каждые 2 секунды
    const interval = setInterval(loadErrors, 2000);
    return () => clearInterval(interval);
  }, [loadErrors]);

  // Показываем только в режиме разработки
  if (!import.meta.env.DEV) {
    return null;
  }

  const errorCount = errors.length;
  const unreadCount = errors.filter(e => e.timestamp > Date.now() - 5000).length;

  return (
    <>
      {/* Кнопка для открытия панели ошибок */}
      {errorCount > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-black font-bold flex items-center gap-2 hover:bg-red-700 transition-colors"
          title={`${errorCount} errors logged. Click to view.`}
        >
          <span>🚨</span>
          <span>{errorCount}</span>
          {unreadCount > 0 && (
            <span className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-xs font-bold">
              {unreadCount} new
            </span>
          )}
        </button>
      )}

      {/* Панель с ошибками */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b-4 border-black bg-red-600 text-white">
              <h2 className="text-2xl font-bold uppercase">
                Error Logger ({errorCount} errors)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    errorLogger.clear();
                    loadErrors();
                  }}
                  className="px-4 py-2 bg-black text-white font-bold uppercase border-2 border-white hover:bg-white hover:text-black transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center border-2 border-white hover:bg-white hover:text-black transition-colors"
                >
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {errors.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No errors logged yet.</p>
              ) : (
                errors.map((error) => (
                  <div
                    key={error.id}
                    className="border-2 border-black p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-bold uppercase ${
                            error.type === 'error' ? 'bg-red-500 text-white' :
                            error.type === 'warning' ? 'bg-yellow-500 text-black' :
                            error.type === 'unhandledRejection' ? 'bg-orange-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            {error.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-bold text-black mb-1">{error.message}</p>
                        {error.source && (
                          <p className="text-xs text-gray-600 mb-1">Source: {error.source}</p>
                        )}
                      </div>
                    </div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-gray-700 hover:text-black">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs bg-black text-green-400 p-2 overflow-x-auto">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {error.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-gray-700 hover:text-black">
                          Details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 overflow-x-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ErrorLogger;

