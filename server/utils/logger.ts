/**
 * Server-side logger utility
 * Provides consistent logging with environment awareness
 */
const isProduction = process.env.NODE_ENV === 'production';
const isDev = !isProduction;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Errors are always logged, even in production
    console.error(...args);
  },
  
  success: (...args: any[]) => {
    if (isDev) console.log('✅', ...args);
  },
  
  debug: (...args: any[]) => {
    if (isDev) console.log('🔍', ...args);
  },
};

