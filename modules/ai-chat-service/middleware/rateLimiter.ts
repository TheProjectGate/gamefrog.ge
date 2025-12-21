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