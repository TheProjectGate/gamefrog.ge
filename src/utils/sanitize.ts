/**
 * Простая санитизация SVG для предотвращения XSS
 * Удаляет потенциально опасные теги и атрибуты
 * Нормализует размеры для автоматического масштабирования
 */
export const sanitizeSVG = (svg: string): string => {
  if (!svg || typeof svg !== 'string') return '';
  
  // Удаляем script теги и их содержимое
  let sanitized = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Удаляем event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Удаляем javascript: протоколы
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Удаляем data: протоколы кроме data:image
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
  
  // Нормализуем размеры SVG для автоматического масштабирования
  // Удаляем фиксированные width и height, оставляем viewBox если есть
  sanitized = sanitized.replace(/\s+width\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+width\s*=\s*[^\s>]*/gi, '');
  sanitized = sanitized.replace(/\s+height\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+height\s*=\s*[^\s>]*/gi, '');
  
  // Если нет viewBox, пытаемся добавить его из width/height (если они были в исходном SVG)
  // Но для простоты просто добавляем style для масштабирования
  if (!sanitized.includes('viewBox') && sanitized.includes('<svg')) {
    // Добавляем style для автоматического масштабирования, если его еще нет
    if (!sanitized.includes('style=')) {
      sanitized = sanitized.replace(/<svg([^>]*)>/i, '<svg$1 style="width: 100%; height: 100%;">');
    } else {
      // Если style уже есть, добавляем width и height к нему
      sanitized = sanitized.replace(/style\s*=\s*["']([^"']*)["']/i, (match, styles) => {
        if (!styles.includes('width') && !styles.includes('height')) {
          return `style="${styles}; width: 100%; height: 100%;"`;
        }
        return match;
      });
    }
  } else if (sanitized.includes('<svg')) {
    // Если viewBox есть, просто добавляем style для масштабирования
    if (!sanitized.includes('style=')) {
      sanitized = sanitized.replace(/<svg([^>]*)>/i, '<svg$1 style="width: 100%; height: 100%;">');
    }
  }
  
  return sanitized;
};

