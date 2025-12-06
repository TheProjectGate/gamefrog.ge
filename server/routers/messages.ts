import express from 'express';
import { pool } from '../server';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET /api/messages - Get all messages for logged in user
router.get('/', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await pool.execute(
      `SELECT id, subject, body, created_at, is_read, is_archived, is_deleted, type
       FROM user_messages 
       WHERE user_email = ?
       ORDER BY created_at DESC`,
      [userEmail]
    );

    res.json(rows);
  } catch (error) {
    console.error('[messages] Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// GET /api/messages/:email - Get messages for a specific user (admin only)
router.get('/:email', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { email } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    let query = `SELECT id, subject, body, created_at, is_read, is_archived, is_deleted, type
                 FROM user_messages 
                 WHERE user_email = ?`;
    
    if (!includeDeleted) {
      query += ' AND is_deleted = FALSE';
    }
    
    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(query, [email]);

    res.json(rows);
  } catch (error) {
    console.error('[messages] Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Create a new message
router.post('/', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { userEmail, subject, body, type } = req.body;

    if (!userEmail || !subject || !body) {
      return res.status(400).json({ message: 'userEmail, subject, and body are required' });
    }

    // Only admin can create messages for other users
    if (userEmail !== user.email && user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only create messages for yourself' });
    }

    const [result] = await pool.execute(
      `INSERT INTO user_messages (user_email, subject, body, type)
       VALUES (?, ?, ?, ?)`,
      [userEmail, subject, body, type || 'general']
    );

    const messageId = (result as any).insertId;

    res.status(201).json({
      id: messageId,
      userEmail,
      subject,
      body,
      type: type || 'general',
      is_read: false,
      is_archived: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[messages] Error creating message:', error);
    res.status(500).json({ message: 'Failed to create message' });
  }
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const messageId = parseInt(req.params.id);

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify message belongs to user
    const [check] = await pool.execute(
      'SELECT id FROM user_messages WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    if ((check as any[]).length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await pool.execute(
      'UPDATE user_messages SET is_read = TRUE WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('[messages] Error marking message as read:', error);
    res.status(500).json({ message: 'Failed to mark message as read' });
  }
});

// PUT /api/messages/:id/delete - Move message to trash (soft delete)
router.put('/:id/delete', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const messageId = parseInt(req.params.id);

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify message belongs to user
    const [check] = await pool.execute(
      'SELECT id FROM user_messages WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    if ((check as any[]).length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await pool.execute(
      'UPDATE user_messages SET is_deleted = TRUE WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    res.json({ message: 'Message moved to trash' });
  } catch (error) {
    console.error('[messages] Error deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

// PUT /api/messages/bulk/delete - Move multiple messages to trash
router.put('/bulk/delete', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const { messageIds } = req.body;

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Invalid message IDs' });
    }

    const placeholders = messageIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE user_messages SET is_deleted = TRUE 
       WHERE id IN (${placeholders}) AND user_email = ?`,
      [...messageIds, userEmail]
    );

    res.json({ message: 'Messages moved to trash' });
  } catch (error) {
    console.error('[messages] Error bulk deleting messages:', error);
    res.status(500).json({ message: 'Failed to delete messages' });
  }
});

// PUT /api/messages/:id/archive - Archive message
router.put('/:id/archive', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const messageId = parseInt(req.params.id);

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      'UPDATE user_messages SET is_archived = TRUE WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    res.json({ message: 'Message archived' });
  } catch (error) {
    console.error('[messages] Error archiving message:', error);
    res.status(500).json({ message: 'Failed to archive message' });
  }
});

// PUT /api/messages/bulk/archive - Archive multiple messages
router.put('/bulk/archive', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const { messageIds } = req.body;

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Invalid message IDs' });
    }

    const placeholders = messageIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE user_messages SET is_archived = TRUE 
       WHERE id IN (${placeholders}) AND user_email = ?`,
      [...messageIds, userEmail]
    );

    res.json({ message: 'Messages archived' });
  } catch (error) {
    console.error('[messages] Error bulk archiving messages:', error);
    res.status(500).json({ message: 'Failed to archive messages' });
  }
});

// PUT /api/messages/:id/unarchive - Unarchive message
router.put('/:id/unarchive', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const messageId = parseInt(req.params.id);

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      'UPDATE user_messages SET is_archived = FALSE WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    res.json({ message: 'Message unarchived' });
  } catch (error) {
    console.error('[messages] Error unarchiving message:', error);
    res.status(500).json({ message: 'Failed to unarchive message' });
  }
});

// PUT /api/messages/bulk/unarchive - Unarchive multiple messages
router.put('/bulk/unarchive', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const { messageIds } = req.body;

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Invalid message IDs' });
    }

    const placeholders = messageIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE user_messages SET is_archived = FALSE 
       WHERE id IN (${placeholders}) AND user_email = ?`,
      [...messageIds, userEmail]
    );

    res.json({ message: 'Messages unarchived' });
  } catch (error) {
    console.error('[messages] Error bulk unarchiving messages:', error);
    res.status(500).json({ message: 'Failed to unarchive messages' });
  }
});

// PUT /api/messages/:id/restore - Restore message from trash
router.put('/:id/restore', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const messageId = parseInt(req.params.id);

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      'UPDATE user_messages SET is_deleted = FALSE WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    res.json({ message: 'Message restored' });
  } catch (error) {
    console.error('[messages] Error restoring message:', error);
    res.status(500).json({ message: 'Failed to restore message' });
  }
});

// PUT /api/messages/bulk/restore - Restore multiple messages from trash
router.put('/bulk/restore', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const { messageIds } = req.body;

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ message: 'Invalid message IDs' });
    }

    const placeholders = messageIds.map(() => '?').join(',');
    await pool.execute(
      `UPDATE user_messages SET is_deleted = FALSE 
       WHERE id IN (${placeholders}) AND user_email = ?`,
      [...messageIds, userEmail]
    );

    res.json({ message: 'Messages restored' });
  } catch (error) {
    console.error('[messages] Error bulk restoring messages:', error);
    res.status(500).json({ message: 'Failed to restore messages' });
  }
});

// DELETE /api/messages/:id - Permanently delete message
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    const messageId = parseInt(req.params.id);

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await pool.execute(
      'DELETE FROM user_messages WHERE id = ? AND user_email = ?',
      [messageId, userEmail]
    );

    res.json({ message: 'Message permanently deleted' });
  } catch (error) {
    console.error('[messages] Error permanently deleting message:', error);
    res.status(500).json({ message: 'Failed to delete message' });
  }
});

export default router;
