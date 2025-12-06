import { Product } from '../types';
import { INITIAL_PRODUCTS } from '../store/constants';
import { logger } from '../utils/logger';
import { retry } from '../utils/retry';
import { getCached, setCached } from '../utils/cache';
import { getApiBaseUrl } from './baseUrl';

const API_BASE_URL = getApiBaseUrl();
const USE_FALLBACK = import.meta.env.VITE_USE_FALLBACK_DATA === 'true';
const CACHE_KEY = 'products';
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Нормализует данные продукта из API
 */
const normalizeProduct = (product: any): Product => {
  // Parse bundleItems if it's a string (should already be parsed by backend, but just in case)
  let bundleItems: number[] | undefined = undefined;
  if (product.bundleItems) {
    if (typeof product.bundleItems === 'string') {
      try {
        bundleItems = JSON.parse(product.bundleItems);
      } catch (e) {
        bundleItems = undefined;
      }
    } else if (Array.isArray(product.bundleItems)) {
      bundleItems = product.bundleItems;
    }
  }

  return {
    ...product,
    price: typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0),
    stock: typeof product.stock === 'string' ? parseInt(product.stock) : (product.stock || 0),
    goldCoins: product.goldCoins ? (typeof product.goldCoins === 'string' ? parseInt(product.goldCoins) : product.goldCoins) : undefined,
    coinPrice: product.coinPrice ? (typeof product.coinPrice === 'string' ? parseInt(product.coinPrice) : product.coinPrice) : undefined,
    wishlistCount: product.wishlistCount ? (typeof product.wishlistCount === 'string' ? parseInt(product.wishlistCount) : product.wishlistCount) : 0,
    tags: product.tags || [],
    platforms: product.platforms || [],
    bundleItems: bundleItems,
    filterValues: product.filterValues || undefined,
    discountPercent: product.discountPercent ? (typeof product.discountPercent === 'string' ? parseFloat(product.discountPercent) : product.discountPercent) : undefined,
  };
};

/**
 * Выполняет запрос к API
 */
const fetchFromAPI = async (): Promise<Product[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  
  try {
    // Request all products with a large limit to avoid pagination issues
    const response = await fetch(`${API_BASE_URL}/api/products?page=1&limit=10000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    
    // Проверяем Content-Type перед парсингом JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Если получили HTML вместо JSON, читаем текст для лучшего сообщения об ошибке
      const text = await response.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error(`API returned HTML instead of JSON. The endpoint may not exist or the server returned an error page.`);
      }
      throw new Error(`API returned unexpected content type: ${contentType}`);
    }
    
    const responseData = await response.json();
    
    // Поддержка нового формата с пагинацией и старого формата (массив)
    let products: any[];
    if (Array.isArray(responseData)) {
      // Старый формат - просто массив
      products = responseData;
    } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
      // Новый формат - объект с пагинацией
      products = responseData.data;
    } else {
      logger.warn('⚠️ Unexpected response format from API');
      return [];
    }
    
    if (!products || products.length === 0) {
      logger.info('ℹ️ Database is empty. No products found.');
      return [];
    }
    
    return products.map(normalizeProduct);
  } catch (error: any) {
    // Если это ошибка парсинга JSON, предоставляем более понятное сообщение
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      throw new Error(`Failed to parse JSON response. The API may have returned HTML or invalid data.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchProductsAPI = async (forceRefresh: boolean = false): Promise<Product[]> => {
  // Если явно включен режим fallback, используем локальные данные
  if (USE_FALLBACK) {
    logger.warn('⚠️ Using fallback data (INITIAL_PRODUCTS). VITE_USE_FALLBACK_DATA is enabled.');
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(INITIAL_PRODUCTS);
      }, 500);
    });
  }

  // Проверяем кэш, если не требуется принудительное обновление
  if (!forceRefresh) {
    const cached = getCached<Product[]>(CACHE_KEY);
    if (cached) {
      logger.info('📦 Using cached products');
      return cached;
    }
  }

  try {
    // В режиме разработки делаем быструю проверку доступности бэкенда
    if (import.meta.env.DEV) {
      try {
        const healthCheck = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // 2 секунды на проверку
        });
        if (!healthCheck.ok) {
          throw new Error('Backend health check failed');
        }
      } catch (healthError: any) {
        // Бэкенд недоступен - сразу используем локальные данные без повторных попыток
        if (!(window as any).__backendWarningShown) {
          logger.info('ℹ️ Backend API is not available. Using local data (INITIAL_PRODUCTS).');
          logger.info('💡 To use database, run: npm run dev (starts both frontend and backend)');
          (window as any).__backendWarningShown = true;
        }
        return INITIAL_PRODUCTS;
      }
    }

    // Используем retry механизм с экспоненциальной задержкой
    const products = await retry(
      fetchFromAPI,
      {
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential',
        onRetry: (attempt, error) => {
          // В режиме разработки не показываем предупреждения о повторных попытках
          // если это явно ошибка подключения
          if (!import.meta.env.DEV || !error.message.includes('HTML instead of JSON')) {
            logger.warn(`⚠️ Retry attempt ${attempt}/3: ${error.message}`);
          }
        },
      }
    );

    // Сохраняем в кэш
    setCached(CACHE_KEY, products, CACHE_TTL);
    
    return products;
  } catch (error: any) {
    // Пытаемся использовать кэш даже если он устарел
    const staleCache = getCached<Product[]>(CACHE_KEY);
    if (staleCache) {
      logger.warn('⚠️ Using stale cache due to API error');
      return staleCache;
    }

    // В режиме разработки при ошибке подключения используем fallback данные
    if (import.meta.env.DEV) {
      if (!(window as any).__backendWarningShown) {
        logger.info('ℹ️ Backend API is not available. Using local data (INITIAL_PRODUCTS).');
        logger.info('💡 To use database, run: npm run dev (starts both frontend and backend)');
        (window as any).__backendWarningShown = true;
      }
      return INITIAL_PRODUCTS;
    }
    
    // В продакшене возвращаем пустой массив
    logger.error('❌ Failed to fetch products:', error.message);
    return [];
  }
};

/**
 * Создает новый продукт через API
 */
export const createProductAPI = async (product: Omit<Product, 'id'>): Promise<Product> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to create product');
  }

  const result = await response.json();
  // После создания получаем полный продукт из базы
  const getResponse = await fetch(`${API_BASE_URL}/api/products/${result.id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!getResponse.ok) {
    throw new Error('Failed to fetch created product');
  }

  const createdProduct = normalizeProduct(await getResponse.json());
  
  return createdProduct;
};

/**
 * Обновляет продукт через API
 */
export const updateProductAPI = async (productId: number, updates: Partial<Product>): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to update product');
  }
};

/**
 * Удаляет продукт через API
 */
export const deleteProductAPI = async (productId: number): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to delete product');
  }
};
