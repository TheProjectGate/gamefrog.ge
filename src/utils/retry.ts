/**
 * Утилита для повторных попыток выполнения функции
 */
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'fixed' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delay: 1000,
  backoff: 'exponential',
  onRetry: () => {},
};

/**
 * Выполняет функцию с повторными попытками при ошибке
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Вызываем callback перед повторной попыткой
      opts.onRetry(attempt, lastError);

      // Вычисляем задержку
      const delay = opts.backoff === 'exponential'
        ? opts.delay * Math.pow(2, attempt - 1)
        : opts.delay;

      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

