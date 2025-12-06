import express from 'express';
import { pool } from '../server';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get user settings
router.get('/', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows]: any = await pool.query(
      'SELECT badge_color_order, badge_color_wishlist, badge_color_general FROM user_settings WHERE user_email = ?',
      [userEmail]
    );

    if (rows.length === 0) {
      // Return default settings if no settings exist
      return res.json({
        badgeColors: {
          order: 'green',
          wishlist: 'pink',
          general: 'red',
        },
      });
    }

    const settings = rows[0];
    res.json({
      badgeColors: {
        order: settings.badge_color_order,
        wishlist: settings.badge_color_wishlist,
        general: settings.badge_color_general,
      },
    });
  } catch (error) {
    console.error('[userSettings] Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch user settings' });
  }
});

// Update user settings
router.put('/', authenticate, async (req, res) => {
  try {
    const userEmail = (req as any).user?.email;
    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { badgeColors } = req.body;

    if (!badgeColors || !badgeColors.order || !badgeColors.wishlist || !badgeColors.general) {
      return res.status(400).json({ message: 'Invalid badge colors configuration' });
    }

    // Validate colors
    const validColors = ['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'orange', 'cyan'];
    if (
      !validColors.includes(badgeColors.order) ||
      !validColors.includes(badgeColors.wishlist) ||
      !validColors.includes(badgeColors.general)
    ) {
      return res.status(400).json({ message: 'Invalid color value' });
    }

    await pool.query(
      `INSERT INTO user_settings (user_email, badge_color_order, badge_color_wishlist, badge_color_general)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         badge_color_order = VALUES(badge_color_order),
         badge_color_wishlist = VALUES(badge_color_wishlist),
         badge_color_general = VALUES(badge_color_general)`,
      [userEmail, badgeColors.order, badgeColors.wishlist, badgeColors.general]
    );

    res.json({
      message: 'Settings updated successfully',
      badgeColors,
    });
  } catch (error) {
    console.error('[userSettings] Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update user settings' });
  }
});

export default router;

