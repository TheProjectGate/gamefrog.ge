import { Express, Request, Response } from 'express';
import productsRouter from '../routers/products';
import usersRouter from '../routers/users';
import ordersRouter from '../routers/orders.js';
import paymentsRouter from '../routers/payments';
import paymentCardsRouter from '../routers/paymentCards';
import paymentSettingsRouter from '../routers/paymentSettings';
import wishlistRouter from '../routers/wishlist';
import messagesRouter from '../routers/messages';
import filterGroupsRouter from '../routers/filterGroups';
import analyticsRouter from '../routers/analytics';
import homeSectionsRouter from '../routers/homeSections';
import userSettingsRouter from '../routers/userSettings';
import uploadRouter from '../routers/upload';
import offersRouter from '../routers/offers';
import geminiRouter from '../routers/gemini';
import aiRouter from '../routers/aiRouter';
import aiChatSettingsRouter from '../routers/aiChatSettings';
import chatMessagesRouter from '../routers/chatMessages';
import aiQuotaErrorsRouter from '../routers/aiQuotaErrors';

/**
 * Setup all API routes
 */
export const setupRoutes = (app: Express, port: number) => {
  // API Routes (must be before frontend serving)
  app.use('/api/products', productsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/payment-cards', paymentCardsRouter);
  app.use('/api/payment-settings', paymentSettingsRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/filter-groups', filterGroupsRouter);
  app.use('/api/user-settings', userSettingsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/home-sections', homeSectionsRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/offers', offersRouter);
  // Новый универсальный роутер для всех AI провайдеров
  app.use('/api/ai', aiRouter);
  // Оставляем старый путь /api/gemini для обратной совместимости
  app.use('/api/gemini', geminiRouter);
  app.use('/api/ai-chat-settings', aiChatSettingsRouter);
  app.use('/api/chat-messages', chatMessagesRouter);
  app.use('/api/ai-quota-errors', aiQuotaErrorsRouter);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    try {
      res.json({ status: 'ok', message: 'Server is running', port });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });
};

