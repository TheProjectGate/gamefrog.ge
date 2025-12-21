import express from 'express';
import { pool } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../utils/errorHandler';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { error, timestamp, userEmail } = req.body;
    if (!error) return res.status(400).json({ message: 'Error message is required' });
    await pool.query(`INSERT INTO ai_quota_errors (error_message, user_email, created_at) VALUES (?, ?, ?)`,
      [error, userEmail || null, timestamp ? new Date(timestamp) : new Date()]);
    res.json({ success: true });
  } catch (error) {
    console.error('[AI Chat Service][aiQuotaErrors] Error logging quota error:', error);
    res.json({ success: false });
  }
});

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const [rows]: any = await pool.query(
      `SELECT id, error_message, user_email, created_at FROM ai_quota_errors ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit as string, 10), parseInt(offset as string, 10)]
    );
    const [countRows]: any = await pool.query('SELECT COUNT(*) as total FROM ai_quota_errors');
    res.json({ errors: rows, total: countRows[0]?.total || 0 });
  } catch (error) {
    next(new AppError('Failed to fetch quota errors', 500));
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ai_quota_errors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    next(new AppError('Failed to delete quota error', 500));
  }
});

router.delete('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM ai_quota_errors');
    res.json({ success: true });
  } catch (error) {
    next(new AppError('Failed to delete quota errors', 500));
  }
});

export default router;