import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from '../utils/logger';
import { apiLimiter } from './rateLimiter';

/**
 * Configure CORS middleware
 */
export const configureCORS = (app: Express) => {
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://gamefrog.ge']
      : true, // Allow all origins in development
    credentials: true,
    optionsSuccessStatus: 200
  };
  app.use(cors(corsOptions));
};

/**
 * Configure body parsing middleware
 */
export const configureBodyParsing = (app: Express) => {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
};

/**
 * Request logging middleware (only log errors in production)
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Skip logging for service workers and common static assets
  const skipLogging = [
    '/sw.js',
    '/service-worker.js',
    '/worker.js',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
  ].some(path => req.path === path);
  
  // Skip logging for static assets (images, CSS, JS, fonts, etc.)
  const isStaticAsset = /\.(jpg|jpeg|png|gif|svg|ico|webp|bmp|css|js|woff|woff2|ttf|eot|otf|map|json|xml|pdf|mp4|webm|ogg|mp3|wav)$/i.test(req.path) ||
    req.path.startsWith('/src/') ||
    req.path.startsWith('/assets/') ||
    req.path.startsWith('/node_modules/') ||
    req.path.startsWith('/@vite/') ||
    req.path.startsWith('/@react-refresh');
  
  res.on('finish', () => {
    if (skipLogging || isStaticAsset) return;
    
    const duration = Date.now() - start;
    
    // Only log errors in production, log all requests in development
    if (res.statusCode >= 400) {
      logger.error(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  
  next();
};

/**
 * Content Security Policy (CSP) middleware
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Strict CSP without unsafe-eval
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: https: https://www.google-analytics.com; " +
      "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com; " +
      "worker-src 'self' blob:; " +
      "manifest-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  } else {
    // Development: Allow unsafe-eval for Vite HMR, dev server, and Google Analytics
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:* ws://localhost:* wss://localhost:* https://www.googletagmanager.com https://www.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: https: https://www.google-analytics.com; " +
      "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://fonts.googleapis.com https://fonts.gstatic.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com; " +
      "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com; " +
      "worker-src 'self' blob:; " +
      "manifest-src 'self'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }
  
  next();
};

/**
 * Setup all middleware for Express app
 */
export const setupMiddleware = (app: Express) => {
  configureCORS(app);
  configureBodyParsing(app);
  app.use(requestLoggingMiddleware);
  app.use(cspMiddleware);
  app.use('/api', apiLimiter);
};

