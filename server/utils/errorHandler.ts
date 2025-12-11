// Error handling utilities

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error details
  console.error('Error:', {
    message: err.message,
    stack: isProduction ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });
  // #region agent log
  try {
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
    const logEntry = JSON.stringify({
      location: 'errorHandler.ts:31',
      message: 'Server error caught',
      data: {
        error: err.message,
        stack: isProduction ? undefined : err.stack,
        path: req.path,
        method: req.method,
        code: (err as any).code,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E',
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  } catch (logError) {}
  // #endregion

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  }

  // Handle MySQL errors
  if ((err as any).code) {
    const mysqlError = err as any;
    switch (mysqlError.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          error: 'Resource already exists',
          message: isProduction ? undefined : mysqlError.message,
        });
      case 'ER_NO_REFERENCED_ROW_2':
      case 'ER_ROW_IS_REFERENCED_2':
        return res.status(400).json({
          error: 'Invalid reference',
          message: isProduction ? undefined : mysqlError.message,
        });
      default:
        break;
    }
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction ? undefined : err.message,
  });
};

