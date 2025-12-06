import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server';
import { validateId, validateString } from '../utils/validation';
import { AppError } from '../utils/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter, createLimiter, updateLimiter } from '../middleware/rateLimiter';
import { cache } from '../utils/cache';

const router = Router();

// Helper function to check if columns exist
async function checkColumns(): Promise<{ hasName: boolean; hasBgColor: boolean }> {
  const [nameCheck] = await pool.execute(
    `SELECT COUNT(*) as count 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'limited_time_offers' 
     AND COLUMN_NAME = 'name'`
  );
  const hasName = (nameCheck as any[])[0]?.count > 0;
  
  const [bgColorCheck] = await pool.execute(
    `SELECT COUNT(*) as count 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'limited_time_offers' 
     AND COLUMN_NAME = 'background_color'`
  );
  const hasBgColor = (bgColorCheck as any[])[0]?.count > 0;
  
  return { hasName, hasBgColor };
}

// Helper function to build select fields
function buildSelectFields(hasName: boolean, hasBgColor: boolean, includeTimestamps = true): string {
  let fields = 'id, background_image_url, discount_percent, ends_at';
  if (includeTimestamps) {
    fields += ', is_active, redirect_url, show_frequency, created_at, updated_at';
  } else {
    fields += ', redirect_url, show_frequency';
  }
  if (hasName) fields = fields.replace('id, ', 'id, name, ');
  if (hasBgColor) fields = fields.replace('background_image_url', 'background_image_url, background_color');
  return fields;
}

// GET /api/offers - Get all offers
router.get('/', apiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { hasName, hasBgColor } = await checkColumns();
    const selectFields = buildSelectFields(hasName, hasBgColor, true);
    
    const [rows] = await pool.execute(
      `SELECT ${selectFields}
      FROM limited_time_offers
      ORDER BY created_at DESC`
    );
    
    const offers = await Promise.all((rows as any[]).map(async (offer) => {
      // Get product IDs for this offer
      const [productRows] = await pool.execute(
        'SELECT product_id FROM offer_products WHERE offer_id = ?',
        [offer.id]
      );
      const productIds = (productRows as any[]).map(row => parseInt(row.product_id));
      
      return {
        id: offer.id,
        name: offer.name || null,
        backgroundImageUrl: offer.background_image_url,
        backgroundColor: offer.background_color || '#FFFFFF',
        discountPercent: offer.discount_percent ? parseFloat(offer.discount_percent) : 0,
        endsAt: offer.ends_at,
        isActive: Boolean(offer.is_active),
        redirectUrl: offer.redirect_url,
        productIds: productIds,
        showFrequency: offer.show_frequency || 'once_per_day',
        createdAt: offer.created_at,
        updatedAt: offer.updated_at,
      };
    }));
    
    res.json(offers);
  } catch (error) {
    next(error);
  }
});

// GET /api/offers/active - Get active offer (public endpoint)
router.get('/active', apiLimiter, async (req: Request, res: Response, next) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const { hasName, hasBgColor } = await checkColumns();
    const selectFields = buildSelectFields(hasName, hasBgColor, false);
    
    const [rows] = await pool.execute(
      `SELECT ${selectFields}
      FROM limited_time_offers
      WHERE is_active = TRUE AND ends_at > ?
      ORDER BY created_at DESC
      LIMIT 1`,
      [now]
    );
    
    const offers = rows as any[];
    if (offers.length === 0) {
      return res.json(null);
    }
    
    const offer = offers[0];
    
    // Get product IDs for this offer
    const [productRows] = await pool.execute(
      'SELECT product_id FROM offer_products WHERE offer_id = ?',
      [offer.id]
    );
    const productIds = (productRows as any[]).map(row => parseInt(row.product_id));
    
    const result = {
      id: offer.id,
      name: offer.name || null,
      backgroundImageUrl: offer.background_image_url,
      backgroundColor: offer.background_color || '#FFFFFF',
      discountPercent: offer.discount_percent ? parseFloat(offer.discount_percent) : 0,
      endsAt: offer.ends_at,
      redirectUrl: offer.redirect_url,
      productIds: productIds,
      showFrequency: offer.show_frequency || 'once_per_day',
    };
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/offers/active/all - Get all active offers (public endpoint)
router.get('/active/all', apiLimiter, async (req: Request, res: Response, next) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const { hasName, hasBgColor } = await checkColumns();
    const selectFields = buildSelectFields(hasName, hasBgColor, false);
    
    const [rows] = await pool.execute(
      `SELECT ${selectFields}
      FROM limited_time_offers
      WHERE is_active = TRUE AND ends_at > ?
      ORDER BY created_at DESC`,
      [now]
    );
    
    const offers = rows as any[];
    
    const results = await Promise.all(offers.map(async (offer) => {
      // Get product IDs for this offer
      const [productRows] = await pool.execute(
        'SELECT product_id FROM offer_products WHERE offer_id = ?',
        [offer.id]
      );
      const productIds = (productRows as any[]).map(row => parseInt(row.product_id));
      
      return {
        id: offer.id,
        name: offer.name || null,
        backgroundImageUrl: offer.background_image_url,
        backgroundColor: offer.background_color || '#FFFFFF',
        discountPercent: offer.discount_percent ? parseFloat(offer.discount_percent) : 0,
        endsAt: offer.ends_at,
        redirectUrl: offer.redirect_url,
        productIds: productIds,
        showFrequency: offer.show_frequency || 'once_per_day',
      };
    }));
    
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/offers/:id - Get single offer
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid offer ID', 400);
    }
    
    const { hasName, hasBgColor } = await checkColumns();
    const selectFields = buildSelectFields(hasName, hasBgColor, true);
    
    const [rows] = await pool.execute(
      `SELECT ${selectFields}
      FROM limited_time_offers
      WHERE id = ?`,
      [id]
    );
    
    const offers = rows as any[];
    if (offers.length === 0) {
      throw new AppError('Offer not found', 404);
    }
    
    const offer = offers[0];
    
    // Get product IDs for this offer
    const [productRows] = await pool.execute(
      'SELECT product_id FROM offer_products WHERE offer_id = ?',
      [id]
    );
    const productIds = (productRows as any[]).map(row => parseInt(row.product_id));
    
    const result = {
      id: offer.id,
      name: offer.name || null,
      backgroundImageUrl: offer.background_image_url,
      backgroundColor: offer.background_color || '#FFFFFF',
      discountPercent: offer.discount_percent ? parseFloat(offer.discount_percent) : 0,
      endsAt: offer.ends_at,
      isActive: Boolean(offer.is_active),
      redirectUrl: offer.redirect_url,
      productIds: productIds,
      showFrequency: offer.show_frequency || 'once_per_day',
      createdAt: offer.created_at,
      updatedAt: offer.updated_at,
    };
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/offers - Create new offer (admin only)
router.post('/', authenticate, authorize('admin'), createLimiter, async (req: Request, res: Response, next) => {
  try {
    const {
      name, backgroundImageUrl, backgroundColor, discountPercent, endsAt, isActive, redirectUrl, productIds, showFrequency
    } = req.body;
    
    if (!endsAt) {
      throw new AppError('End date is required', 400);
    }
    
    const { hasName, hasBgColor } = await checkColumns();
    
    let insertFields = 'background_image_url, discount_percent, ends_at, is_active, redirect_url, show_frequency';
    let placeholders = '?, ?, ?, ?, ?, ?';
    let values: any[] = [
      backgroundImageUrl || null,
      discountPercent || 0,
      endsAt,
      isActive !== undefined ? Boolean(isActive) : true,
      redirectUrl || null,
      showFrequency || 'once_per_day',
    ];
    
    if (hasName) {
      insertFields = `name, ${insertFields}`;
      placeholders = `?, ${placeholders}`;
      values.unshift(name || null);
    }
    
    if (hasBgColor) {
      insertFields = `${insertFields}, background_color`;
      placeholders = `${placeholders}, ?`;
      values.push(backgroundColor || '#FFFFFF');
    }
    
    const [result] = await pool.execute(
      `INSERT INTO limited_time_offers (${insertFields}) VALUES (${placeholders})`,
      values
    );
    
    const insertResult = result as any;
    const offerId = insertResult.insertId;
    
    // Insert product associations if provided
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      const productValues = productIds.map((productId: number) => [offerId, productId]);
      await pool.query(
        'INSERT INTO offer_products (offer_id, product_id) VALUES ?',
        [productValues]
      );
    }
    
    // Clear cache
    cache.clear();
    
    res.status(201).json({ id: offerId, message: 'Offer created successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/offers/:id - Update offer (admin only)
router.put('/:id', authenticate, authorize('admin'), updateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid offer ID', 400);
    }
    
    // Check if offer exists
    const [existing] = await pool.execute('SELECT id FROM limited_time_offers WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      throw new AppError('Offer not found', 404);
    }
    
    const {
      name, backgroundImageUrl, backgroundColor, discountPercent, endsAt, isActive, redirectUrl, productIds, showFrequency
    } = req.body;
    
    const { hasBgColor } = await checkColumns();
    
    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name || null);
    }
    if (backgroundImageUrl !== undefined) {
      updates.push('background_image_url = ?');
      values.push(backgroundImageUrl || null);
    }
    if (hasBgColor && backgroundColor !== undefined) {
      updates.push('background_color = ?');
      values.push(backgroundColor || '#FFFFFF');
    }
    if (discountPercent !== undefined) {
      updates.push('discount_percent = ?');
      values.push(discountPercent || 0);
    }
    if (endsAt !== undefined) {
      updates.push('ends_at = ?');
      values.push(endsAt);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(isActive));
    }
    if (redirectUrl !== undefined) {
      updates.push('redirect_url = ?');
      values.push(redirectUrl || null);
    }
    if (showFrequency !== undefined) {
      updates.push('show_frequency = ?');
      values.push(showFrequency || 'once_per_day');
    }
    
    if (updates.length === 0 && productIds === undefined) {
      throw new AppError('No fields to update', 400);
    }
    
    // Update offer fields if there are any
    if (updates.length > 0) {
      values.push(id); // Add id for WHERE clause
      await pool.execute(
        `UPDATE limited_time_offers SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
    
    // Update product associations if provided
    if (productIds !== undefined) {
      // Delete existing associations
      await pool.execute('DELETE FROM offer_products WHERE offer_id = ?', [id]);
      
      // Insert new associations if provided
      if (Array.isArray(productIds) && productIds.length > 0) {
        const productValues = productIds.map((productId: number) => [id, productId]);
        await pool.query(
          'INSERT INTO offer_products (offer_id, product_id) VALUES ?',
          [productValues]
        );
      }
    }
    
    // Clear cache
    cache.clear();
    
    res.json({ message: 'Offer updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/offers/:id - Delete offer (admin only)
router.delete('/:id', authenticate, authorize('admin'), updateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid offer ID', 400);
    }
    
    // Check if offer exists
    const [existing] = await pool.execute('SELECT id FROM limited_time_offers WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      throw new AppError('Offer not found', 404);
    }
    
    await pool.execute('DELETE FROM limited_time_offers WHERE id = ?', [id]);
    
    // Clear cache
    cache.clear();
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
