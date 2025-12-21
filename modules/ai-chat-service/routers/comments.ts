import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { AppError } from '../utils/errorHandler';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

interface Comment {
  id: number;
  product_id: number;
  user_email: string;
  content: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_avatar?: number;
}

/**
 * POST /api/comments
 * Create a new comment
 */
router.post('/', apiLimiter, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, content, rating } = req.body;
    const userEmail = (req as any).user?.email;

    if (!userEmail) throw new AppError('User email not found', 401);
    if (!productId) throw new AppError('Product ID is required', 400);
    if (!content || content.trim().length === 0) throw new AppError('Content is required', 400);
    if (rating !== undefined && (rating < 1 || rating > 5)) throw new AppError('Rating must be between 1 and 5', 400);

    const [result]: any = await pool.execute(
      `INSERT INTO comments (product_id, user_email, content, rating, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [productId, userEmail, content.trim(), rating || null]
    );

    res.json({ id: result.insertId, message: 'Comment created successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/comments/product/:productId
 * Get comments for a specific product
 */
router.get('/product/:productId', apiLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const { limit = 50, offset = 0 } = req.query;

    if (isNaN(productId)) throw new AppError('Invalid product ID', 400);

    const [rows]: any = await pool.execute(
      `SELECT c.*, u.first_name, u.last_name, u.avatar 
       FROM comments c 
       LEFT JOIN users u ON c.user_email = u.email 
       WHERE c.product_id = ? 
       ORDER BY c.created_at DESC 
       LIMIT ? OFFSET ?`,
      [productId, parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );

    const comments: Comment[] = rows.map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      user_email: row.user_email,
      content: row.content,
      rating: row.rating,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_name: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.first_name || row.last_name || row.user_email,
      user_avatar: row.avatar,
    }));

    const [countRows]: any = await pool.query('SELECT COUNT(*) as total FROM comments WHERE product_id = ?', [productId]);

    res.json({ comments, total: countRows[0]?.total || 0 });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/comments/:id
 * Update a comment (only by the author or admin)
 */
router.put('/:id', apiLimiter, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const { content, rating } = req.body;
    const userEmail = (req as any).user?.email;
    const userRole = (req as any).user?.role;

    if (isNaN(commentId)) throw new AppError('Invalid comment ID', 400);
    if (!content || content.trim().length === 0) throw new AppError('Content is required', 400);
    if (rating !== undefined && (rating < 1 || rating > 5)) throw new AppError('Rating must be between 1 and 5', 400);

    // Check if comment exists and user has permission
    const [rows]: any = await pool.execute('SELECT user_email FROM comments WHERE id = ?', [commentId]);
    if (rows.length === 0) throw new AppError('Comment not found', 404);
    if (rows[0].user_email !== userEmail && userRole !== 'admin') {
      throw new AppError('You can only update your own comments', 403);
    }

    await pool.execute(
      `UPDATE comments SET content = ?, rating = ?, updated_at = NOW() WHERE id = ?`,
      [content.trim(), rating || null, commentId]
    );

    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (only by the author or admin)
 */
router.delete('/:id', apiLimiter, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const userEmail = (req as any).user?.email;
    const userRole = (req as any).user?.role;

    if (isNaN(commentId)) throw new AppError('Invalid comment ID', 400);

    // Check if comment exists and user has permission
    const [rows]: any = await pool.execute('SELECT user_email FROM comments WHERE id = ?', [commentId]);
    if (rows.length === 0) throw new AppError('Comment not found', 404);
    if (rows[0].user_email !== userEmail && userRole !== 'admin') {
      throw new AppError('You can only delete your own comments', 403);
    }

    await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/comments
 * Get all comments (admin only)
 */
router.get('/', apiLimiter, authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, userEmail, limit = 100, offset = 0 } = req.query;
    let query = `SELECT c.*, u.first_name, u.last_name, u.avatar FROM comments c LEFT JOIN users u ON c.user_email = u.email WHERE 1=1`;
    const params: any[] = [];

    if (productId) { query += ' AND c.product_id = ?'; params.push(parseInt(productId as string, 10)); }
    if (userEmail) { query += ' AND c.user_email = ?'; params.push(userEmail); }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

    const [rows]: any = await pool.execute(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;