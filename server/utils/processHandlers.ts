import { logger } from './logger';

/**
 * Setup global error handlers for uncaught exceptions and unhandled rejections
 */
export const setupProcessHandlers = () => {
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
};

