import { Express } from 'express';
import { Server } from 'http';
import { logger } from './logger';
import { isPortAvailable, freePort } from './portUtils';
import { setupFrontend } from './frontendSetup';

/**
 * Wait for port to be available
 */
const waitForPort = async (port: number, maxAttempts: number = 10): Promise<boolean> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const portAvailable = await isPortAvailable(port);
    if (portAvailable) {
      return true;
    }
    if (attempt === maxAttempts - 1) {
      logger.error(`Port ${port} is still in use after freeing attempt.`);
      logger.error(`Please manually free the port: npm run server:free-port ${port}`);
      return false;
    }
  }
  return false;
};

/**
 * Setup graceful shutdown handlers
 */
const setupGracefulShutdown = (server: Server) => {
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      logger.success('Server closed');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown...');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

/**
 * Setup server error handlers
 */
const setupServerErrorHandlers = (server: Server, port: number) => {
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error('═══════════════════════════════════════════════════════');
      logger.error(`ERROR: Port ${port} is still in use!`);
      logger.error('═══════════════════════════════════════════════════════');
      logger.error('Solutions:');
      logger.error(`  1. Run: npm run server:free-port ${port}`);
      logger.error(`  2. Or manually check: netstat -ano | findstr :${port}`);
      logger.error(`Error details: ${err.message}`);
      process.exit(1);
    } else {
      logger.error('Server error:', err);
      logger.error('Error code:', err.code);
      logger.error('Error message:', err.message);
      if (err.stack) {
        logger.error('Stack:', err.stack);
      }
      process.exit(1);
    }
  });
};

/**
 * Start the server with automatic port freeing
 */
export const startServer = async (app: Express, port: number, __dirname: string): Promise<void> => {
  try {
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.debug(`Preparing to start server on port ${port}...`);
    
    // Always try to free port first (it's safe - checks if needed)
    const freed = await freePort(port);
    
    if (!freed) {
      logger.error(`Could not free port ${port}.`);
      logger.error(`Try manually: npm run server:free-port ${port}`);
      process.exit(1);
    }
    
    // Wait to ensure port is fully released
    const portReady = await waitForPort(port);
    if (!portReady) {
      process.exit(1);
    }
    
    // Setup frontend serving (must be before error handler)
    await setupFrontend(app, __dirname);
    
    // Import error handler here to avoid circular dependencies
    const { errorHandler } = await import('./errorHandler');
    app.use(errorHandler);
    
    const server = app.listen(port, () => {
      logger.success('═══════════════════════════════════════════════════════');
      logger.success(`Server is running on http://localhost:${port}`);
      logger.info(`API endpoints: http://localhost:${port}/api`);
      logger.info(`Frontend: http://localhost:${port}`);
      logger.info(`Health check: http://localhost:${port}/api/health`);
      logger.success('═══════════════════════════════════════════════════════');
    });

    setupGracefulShutdown(server);
    setupServerErrorHandlers(server, port);
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    if (error.stack) {
      logger.error('Stack:', error.stack);
    }
    process.exit(1);
  }
};

