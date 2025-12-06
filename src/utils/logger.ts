/**
 * Утилита для безопасного логирования
 * В продакшене логи не выводятся
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Ошибки всегда логируем, даже в продакшене
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
};

