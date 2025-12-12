import express, { Express, Request, Response } from 'express';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from './logger';

/**
 * Setup frontend serving (Vite in dev, static files in production)
 */
export const setupFrontend = async (app: Express, __dirname: string): Promise<void> => {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(__dirname, '../../dist');
  const rootPath = path.join(__dirname, '../..');
  
  logger.debug(`Setting up frontend. Production: ${isProduction}, Root: ${rootPath}`);
  
  if (isProduction && existsSync(distPath)) {
    // Production: serve static files
    logger.info('Serving production build from dist/');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development: use Vite middleware
    try {
      logger.debug('Attempting to setup Vite middleware...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: {
            port: undefined, // Use same port as Express server
          }
        },
        appType: 'spa', // Keep 'spa' for client-side routing
        root: rootPath,
        configFile: path.join(rootPath, 'vite.config.ts'),
        optimizeDeps: {
          include: [
            'react',
            'react-dom',
            'react-i18next',
            'lucide-react'
          ],
          esbuildOptions: {
            target: 'es2022'
          }
        },
        esbuild: {
          target: 'es2022'
        }
      });
      
      // Vite middleware should handle all non-API routes
      // It must be added after API routes but before error handler
      // Use a wrapper to skip API routes while preserving Vite middleware functionality
      app.use((req: Request, res: Response, next) => {
        // Skip API routes - let them be handled by API routers
        if (req.path.startsWith('/api')) {
          return next();
        }
        
        // Log module requests for debugging
        if (req.path.includes('.tsx') || req.path.includes('.ts') || req.path.includes('.jsx')) {
          logger.debug(`Vite handling module request: ${req.path}`);
        }
        
        // Let Vite handle everything else
        // vite.middlewares is a Connect middleware, use it directly
        vite.middlewares(req, res, next);
      });
      
      logger.success('Vite middleware configured successfully');
      logger.debug('Vite server root:', rootPath);
      logger.debug('Vite config file:', path.join(rootPath, 'vite.config.ts'));
    } catch (error: any) {
      logger.error('Failed to setup Vite middleware:', error.message);
      if (error.stack) {
        logger.error('Stack:', error.stack);
      }
      logger.error('Make sure vite is installed: npm install vite');
      // Fallback: serve index.html for all non-API routes
      const indexPath = path.join(rootPath, 'index.html');
      logger.debug(`Fallback: checking for index.html at ${indexPath}`);
      if (existsSync(indexPath)) {
        logger.info('Using fallback: serving index.html');
        app.get('*', (req: Request, res: Response) => {
          // Skip API routes
          if (req.path.startsWith('/api')) {
            return;
          }
          res.sendFile(indexPath);
        });
      } else {
        logger.error(`index.html not found at ${indexPath}`);
        app.get('*', (req: Request, res: Response) => {
          // Skip API routes
          if (req.path.startsWith('/api')) {
            return;
          }
          res.status(503).send('Vite dev server not available. Please run: npm install');
        });
      }
    }
  }
};

