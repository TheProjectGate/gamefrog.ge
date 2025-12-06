import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 100, // Much higher limit in dev mode
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req: Request) => isDevelopment, // Skip rate limiting in development
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(
        req.rateLimit?.resetTime && typeof req.rateLimit.resetTime === 'number'
          ? (req.rateLimit.resetTime - Date.now()) / 1000
          : 900
      ),
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 5, // Much higher limit in dev mode
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDevelopment, // Skip rate limiting in development
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login attempts from this IP, please try again after 15 minutes.',
      retryAfter: Math.ceil(
        req.rateLimit?.resetTime && typeof req.rateLimit.resetTime === 'number'
          ? (req.rateLimit.resetTime - Date.now()) / 1000
          : 900
      ),
    });
  },
});

/**
 * Rate limiter for creating resources (POST requests)
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 10, // Much higher limit in dev mode
  message: 'Too many create requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDevelopment, // Skip rate limiting in development
});

/**
 * Rate limiter for update/delete operations
 */
export const updateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 20, // Much higher limit in dev mode
  message: 'Too many update requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => isDevelopment, // Skip rate limiting in development
});

