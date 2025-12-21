import express from 'express';
import { pool } from '../server';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../utils/errorHandler';

const router = express.Router();

// POST /api/ai-quota-errors - Логирование ошибок квоты (публичный endpoint)
router.post('/', async (req, res, next) => {
  try {
    const { error, timestamp, userEmail } = req.body;

    if (!error) {
      return res.status(400).json({ message: 'Error message is required' });
    }

    // Сохраняем ошибку в базу данных
    await pool.query(
      `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
       VALUES (?, ?, ?)`,
      [error, userEmail || null, timestamp ? new Date(timestamp) : new Date()]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[aiQuotaErrors] Error logging quota error:', error);
    // Не возвращаем ошибку клиенту, чтобы не показывать пользователю
    res.json({ success: false });
  }
});

// GET /api/ai-quota-errors - Получить список ошибок квоты (только для админов)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const [rows]: any = await pool.query(
      `SELECT id, error_message, user_email, created_at 
       FROM ai_quota_errors 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );

    const [countRows]: any = await pool.query(
      'SELECT COUNT(*) as total FROM ai_quota_errors'
    );

    res.json({
      errors: rows,
      total: countRows[0]?.total || 0,
    });
  } catch (error) {
    console.error('[aiQuotaErrors] Error fetching quota errors:', error);
    next(new AppError('Failed to fetch quota errors', 500));
  }
});

// DELETE /api/ai-quota-errors/:id - Удалить ошибку (только для админов)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM ai_quota_errors WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('[aiQuotaErrors] Error deleting quota error:', error);
    next(new AppError('Failed to delete quota error', 500));
  }
});

// DELETE /api/ai-quota-errors - Удалить все ошибки (только для админов)
router.delete('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ai_quota_errors');

    res.json({ success: true });
  } catch (error) {
    console.error('[aiQuotaErrors] Error deleting all quota errors:', error);
    next(new AppError('Failed to delete quota errors', 500));
  }
});

export default router;
