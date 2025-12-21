import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testDatabaseConnection } from './config/database';
import { errorHandler } from './utils/errorHandler';

// Import routers
import geminiRouter from './routers/gemini';
import chatMessagesRouter from './routers/chatMessages';
import aiChatSettingsRouter from './routers/aiChatSettings';
import aiQuotaErrorsRouter from './routers/aiQuotaErrors';
import commentsRouter from './routers/comments';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app: Express = express();
const PORT = process.env.AI_CHAT_SERVICE_PORT ? parseInt(process.env.AI_CHAT_SERVICE_PORT, 10) : 5434;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-chat-service', port: PORT });
});

// API Routes
app.use('/api/gemini', geminiRouter);
app.use('/api/chat-messages', chatMessagesRouter);
app.use('/api/ai-chat-settings', aiChatSettingsRouter);
app.use('/api/ai-quota-errors', aiQuotaErrorsRouter);
app.use('/api/comments', commentsRouter);

// Error handler (must be last)
app.use(errorHandler);

// Start server
testDatabaseConnection();

app.listen(PORT, () => {
  console.log(`[AI Chat Service] Server running on port ${PORT}`);
  console.log(`[AI Chat Service] Health check: http://localhost:${PORT}/api/health`);
});

// Export app and pool for use in other modules
export default app;
export { pool };