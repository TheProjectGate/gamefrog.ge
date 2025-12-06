/**
 * Утилита для кэширования данных в localStorage
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live в миллисекундах
}

const CACHE_PREFIX = 'gf_cache_';

/**
 * Получить данные из кэша
 */
export function getCached<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Проверяем, не истек ли срок действия
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Сохранить данные в кэш
 */
export function setCached<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error('Error writing to cache:', error);
    // Если localStorage переполнен, пытаемся очистить старые записи
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldCache();
      try {
        localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to cache after cleanup:', retryError);
      }
    }
  }
}

/**
 * Удалить данные из кэша
 */
export function clearCache(key: string): void {
  localStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Очистить весь кэш
 */
export function clearAllCache(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Очистить устаревшие записи кэша
 */
function clearOldCache(): void {
  const keys = Object.keys(localStorage);
  const now = Date.now();

  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry<unknown> = JSON.parse(cached);
          if (now - entry.timestamp > entry.ttl) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Если не удалось распарсить, удаляем запись
        localStorage.removeItem(key);
      }
    }
  });
}

/**
 * Проверить, есть ли данные в кэше и не истекли ли они
 */
export function isCached(key: string): boolean {
  return getCached(key) !== null;
}

