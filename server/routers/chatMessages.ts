import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server';
import { AppError } from '../utils/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

interface ChatMessage {
  id: number;
  user_email: string;
  role: 'user' | 'assistant';
  content: string;
  pending_actions?: Array<{
    type: 'ADD_TO_CART' | 'ADD_TO_WISHLIST';
    productId: number;
    productName?: string;
  }>;
  metadata?: {
    productMentions?: string[];
    userInfoMentions?: string[];
    actions?: string[];
  };
  created_at: string;
}

/**
 * POST /api/chat-messages
 * Save a chat message
 */
router.post(
  '/',
  apiLimiter,
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, content, pendingActions, metadata } = req.body;
      const userEmail = (req as any).user?.email;

      if (!userEmail) {
        throw new AppError('User email not found', 401);
      }

      if (!role || !content) {
        throw new AppError('Role and content are required', 400);
      }

      if (!['user', 'assistant'].includes(role)) {
        throw new AppError('Invalid role. Must be "user" or "assistant"', 400);
      }

      const [result]: any = await pool.execute(
        `INSERT INTO chat_messages (user_email, role, content, pending_actions, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userEmail,
          role,
          content,
          pendingActions ? JSON.stringify(pendingActions) : null,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );

      res.json({
        id: result.insertId,
        message: 'Chat message saved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/chat-messages/:userEmail
 * Get chat messages for a specific user (admin only)
 */
router.get(
  '/:userEmail',
  apiLimiter,
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userEmail = req.params.userEmail;
      const { startDate, endDate, limit = 1000 } = req.query;
      const currentUser = (req as any).user;

      // Check if user is admin
      if (currentUser?.role !== 'admin') {
        throw new AppError('Admin access required', 403);
      }

      let query = 'SELECT * FROM chat_messages WHERE user_email = ?';
      const params: any[] = [userEmail];

      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY created_at ASC LIMIT ?';
      params.push(parseInt(limit as string, 10));

      const [rows]: any = await pool.execute(query, params);

      const messages: ChatMessage[] = rows.map((row: any) => ({
        id: row.id,
        user_email: row.user_email,
        role: row.role,
        content: row.content,
        pending_actions: row.pending_actions ? JSON.parse(row.pending_actions) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        created_at: row.created_at,
      }));

      res.json(messages);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/chat-messages
 * Get all chat messages with user info (admin only, for Users Management)
 */
router.get(
  '/',
  apiLimiter,
  authenticate,
  // Removed authorize('admin') to allow users to fetch their own messages
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;

      // Ensure user is authenticated (should be covered by middleware, but for safety)
      if (!currentUser) {
        throw new AppError('Authentication required', 401);
      }

      const { startDate, endDate, userEmail, limit = 1000 } = req.query;

      let query = `
        SELECT 
          cm.*,
          u.first_name,
          u.last_name,
          u.phone,
          u.address
        FROM chat_messages cm
        LEFT JOIN users u ON cm.user_email = u.email
        WHERE 1=1
      `;
      const params: any[] = [];

      // Access Control:
      // If admin: can filter by any userEmail
      // If user: can ONLY fetch their own messages
      if (currentUser.role === 'admin') {
        if (userEmail) {
          query += ' AND cm.user_email = ?';
          params.push(userEmail);
        }
      } else {
        // Regular user - force filter by their email
        query += ' AND cm.user_email = ?';
        params.push(currentUser.email);
      }

      if (startDate) {
        query += ' AND cm.created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND cm.created_at <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY cm.created_at DESC LIMIT ?';
      params.push(parseInt(limit as string, 10));

      const [rows]: any = await pool.execute(query, params);

      const messages = rows.map((row: any) => ({
        id: row.id,
        user_email: row.user_email,
        user_name: row.first_name && row.last_name
          ? `${row.first_name} ${row.last_name}`
          : row.first_name || row.last_name || row.user_email,
        user_phone: row.phone,
        user_address: row.address,
        role: row.role,
        content: row.content,
        pending_actions: row.pending_actions ? JSON.parse(row.pending_actions) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        created_at: row.created_at,
      }));

      res.json(messages);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/chat-messages
 * Delete chat messages by date range (admin only)
 */
router.delete(
  '/',
  apiLimiter,
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;

      // Check if user is admin
      if (currentUser?.role !== 'admin') {
        throw new AppError('Admin access required', 403);
      }

      const { startDate, endDate, userEmail, period } = req.body;

      if (!startDate && !endDate && !period) {
        throw new AppError('Either date range or period must be provided', 400);
      }

      let query = 'DELETE FROM chat_messages WHERE 1=1';
      const params: any[] = [];

      // Handle period shortcuts
      if (period) {
        const now = new Date();
        let periodStartDate: Date;

        switch (period) {
          case 'week':
            periodStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            periodStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            periodStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            throw new AppError('Invalid period. Use "week", "month", or "year"', 400);
        }

        query += ' AND created_at >= ?';
        params.push(periodStartDate.toISOString().split('T')[0]);
      } else {
        if (startDate) {
          query += ' AND created_at >= ?';
          params.push(startDate);
        }

        if (endDate) {
          query += ' AND created_at <= ?';
          params.push(endDate);
        }
      }

      if (userEmail) {
        query += ' AND user_email = ?';
        params.push(userEmail);
      }

      const [result]: any = await pool.execute(query, params);

      res.json({
        deletedCount: result.affectedRows,
        message: `Deleted ${result.affectedRows} chat message(s)`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/chat-messages/:id
 * Delete a specific chat message (admin only)
 */
router.delete(
  '/:id',
  apiLimiter,
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;

      // Check if user is admin
      if (currentUser?.role !== 'admin') {
        throw new AppError('Admin access required', 403);
      }

      const messageId = parseInt(req.params.id, 10);

      if (isNaN(messageId)) {
        throw new AppError('Invalid message ID', 400);
      }

      const [result]: any = await pool.execute(
        'DELETE FROM chat_messages WHERE id = ?',
        [messageId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('Message not found', 404);
      }

      res.json({
        message: 'Chat message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
