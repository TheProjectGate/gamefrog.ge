import { Express } from 'express';
import { createApp, getPort, getDirname } from './config/app';
import { setupMiddleware } from './middleware/index';
import { setupRoutes } from './config/routes';
import { pool, testDatabaseConnection } from './config/database';
import { setupProcessHandlers } from './utils/processHandlers';
import { startServer } from './utils/serverStartup';

// Setup global error handlers
setupProcessHandlers();

// Create Express app
const app: Express = createApp();

// Get port and directory
const PORT = getPort();
const __dirname = getDirname();

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app, PORT);

// Setup database connection
testDatabaseConnection();

// Start the server (this will setup frontend and then error handler)
startServer(app, PORT, __dirname);

// Export app and pool for use in other modules
export default app;
export { pool };

