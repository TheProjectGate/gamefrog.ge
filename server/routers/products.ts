import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server';
import { validateId, validateNumber, validateString } from '../utils/validation';
import { AppError } from '../utils/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { apiLimiter, createLimiter, updateLimiter } from '../middleware/rateLimiter';
import { parsePagination, createPaginationResponse, getTotalCount } from '../utils/pagination';
import { cache, generateCacheKey } from '../utils/cache';

const router = Router();

// GET /api/products - Get all products with pagination
router.get('/', apiLimiter, async (req: Request, res: Response, next) => {
  try {
    // Parse pagination
    const { page, limit, offset } = parsePagination(req.query);
    
    // Check cache
    const cacheKey = generateCacheKey('products', { page, limit });
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    const conditionCol = '`condition`';
    
    // Get total count
    const total = await getTotalCount(pool, 'products');
    
    // Get paginated products
    const [rows] = await pool.execute(
      'SELECT ' +
        'id, name, price, description, image_url as imageUrl, ' +
        'genre, ' + conditionCol + ', stock, tags, platforms, gold_coins as goldCoins, ' +
        'coin_exclusive as coinExclusive, coin_price as coinPrice, ' +
        'bundle_items as bundleItems, filter_values as filterValues, ' +
        'discount_percent as discountPercent, wishlist_count as wishlistCount, ' +
        'youtube_video_id as youtubeVideoId ' +
      'FROM products ' +
      'ORDER BY id ASC ' +
      'LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    const products = (rows as any[]).map(product => {
      let bundleItems = undefined;
      if (product.bundleItems) {
        try {
          bundleItems = JSON.parse(product.bundleItems);
          // Debug log for bundles
          if (Array.isArray(bundleItems) && bundleItems.length >= 2) {
            console.log('[products.ts] Loaded bundle from DB:', {
              id: product.id,
              name: product.name,
              bundleItemsRaw: product.bundleItems,
              bundleItemsParsed: bundleItems,
              isArray: Array.isArray(bundleItems),
              length: bundleItems.length,
            });
          }
        } catch (e) {
          console.error('[products.ts] Failed to parse bundleItems for product', product.id, ':', e);
          bundleItems = undefined;
        }
      }
      
      // Parse genre - support both JSON array and legacy string format
      let genre = [];
      if (product.genre) {
        try {
          const parsed = JSON.parse(product.genre);
          genre = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // If parsing fails, treat as legacy string format
          genre = [product.genre];
        }
      }
      
      return {
        ...product,
        price: parseFloat(product.price) || 0,
        stock: parseInt(product.stock) || 0,
        goldCoins: product.goldCoins ? parseInt(product.goldCoins) : undefined,
        coinPrice: product.coinPrice ? parseInt(product.coinPrice) : undefined,
        wishlistCount: product.wishlistCount ? parseInt(product.wishlistCount) : 0,
        genre: genre,
        tags: product.tags ? JSON.parse(product.tags) : [],
        platforms: product.platforms ? JSON.parse(product.platforms) : [],
        bundleItems: bundleItems,
        filterValues: product.filterValues ? JSON.parse(product.filterValues) : undefined,
        discountPercent: product.discountPercent ? parseFloat(product.discountPercent) : undefined,
        youtubeVideoId: product.youtubeVideoId || undefined,
      };
    });
    
    const response = createPaginationResponse(products, total, page, limit);
    
    // Cache response
    cache.set(cacheKey, response, 2 * 60 * 1000); // 2 minutes
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid product ID', 400);
    }
    const conditionCol = '`condition`';
    const [rows] = await pool.execute(
      'SELECT ' +
        'id, name, price, description, image_url as imageUrl, ' +
        'genre, ' + conditionCol + ', stock, tags, platforms, gold_coins as goldCoins, ' +
        'coin_exclusive as coinExclusive, coin_price as coinPrice, ' +
        'bundle_items as bundleItems, filter_values as filterValues, ' +
        'discount_percent as discountPercent, wishlist_count as wishlistCount, ' +
        'youtube_video_id as youtubeVideoId ' +
      'FROM products ' +
      'WHERE id = ?',
      [id]
    );
    
    const products = rows as any[];
    if (products.length === 0) {
      throw new AppError('Product not found', 404);
    }
    
    const product = products[0];
    let bundleItems = undefined;
    if (product.bundleItems) {
      try {
        bundleItems = JSON.parse(product.bundleItems);
        console.log('[products.ts] GET single product - bundleItems:', {
          id: product.id,
          name: product.name,
          bundleItemsRaw: product.bundleItems,
          bundleItemsParsed: bundleItems,
          isArray: Array.isArray(bundleItems),
        });
      } catch (e) {
        console.error('[products.ts] Failed to parse bundleItems:', e);
        bundleItems = undefined;
      }
    }
    
    // Parse genre - support both JSON array and legacy string format
    let genre = [];
    if (product.genre) {
      try {
        const parsed = JSON.parse(product.genre);
        genre = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // If parsing fails, treat as legacy string format
        genre = [product.genre];
      }
    }
    
    const result = {
      ...product,
      price: parseFloat(product.price) || 0,
      stock: parseInt(product.stock) || 0,
      goldCoins: product.goldCoins ? parseInt(product.goldCoins) : undefined,
      coinPrice: product.coinPrice ? parseInt(product.coinPrice) : undefined,
      wishlistCount: product.wishlistCount ? parseInt(product.wishlistCount) : 0,
      genre: genre,
      tags: product.tags ? JSON.parse(product.tags) : [],
      platforms: product.platforms ? JSON.parse(product.platforms) : [],
      bundleItems: bundleItems,
      filterValues: product.filterValues ? JSON.parse(product.filterValues) : undefined,
      discountPercent: product.discountPercent ? parseFloat(product.discountPercent) : undefined,
      youtubeVideoId: product.youtubeVideoId || undefined,
    };
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Create new product (admin only)
router.post('/', authenticate, authorize('admin'), createLimiter, async (req: Request, res: Response, next) => {
  try {
    const {
      name, price, description, imageUrl, genre, condition, stock,
      tags, platforms, goldCoins, coinExclusive, coinPrice,
      bundleItems, filterValues, discountPercent, youtubeVideoId
    } = req.body;
    
    // Debug log for bundles
    if (bundleItems && Array.isArray(bundleItems) && bundleItems.length >= 2) {
      console.log('[products.ts] Creating bundle:', {
        name,
        bundleItems,
        bundleItemsType: typeof bundleItems,
        isArray: Array.isArray(bundleItems),
        bundleItemsLength: bundleItems.length,
        bundleItemsStringified: JSON.stringify(bundleItems),
      });
    }
    
    const conditionCol = '`condition`';
    const bundleItemsValue = bundleItems ? JSON.stringify(bundleItems) : null;
    
    console.log('[products.ts] Saving to DB:', {
      bundleItemsValue,
      bundleItemsValueType: typeof bundleItemsValue,
    });
    
    const [result] = await pool.execute(
      'INSERT INTO products (' +
        'name, price, description, image_url, genre, ' + conditionCol + ', stock, ' +
        'tags, platforms, gold_coins, coin_exclusive, coin_price, ' +
        'bundle_items, filter_values, discount_percent, youtube_video_id' +
      ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name, price, description, imageUrl, 
        Array.isArray(genre) ? JSON.stringify(genre) : (genre || JSON.stringify([])), 
        condition || 'new', stock || 0,
        tags ? JSON.stringify(tags) : null,
        platforms ? JSON.stringify(platforms) : null,
        goldCoins || 0, coinExclusive || false, coinPrice || 0,
        bundleItemsValue,
        filterValues ? JSON.stringify(filterValues) : null,
        discountPercent || 0,
        youtubeVideoId || null
      ]
    );
    
    const insertResult = result as any;
    
    // Verify the saved bundle
    const [savedRows] = await pool.execute(
      'SELECT bundle_items FROM products WHERE id = ?',
      [insertResult.insertId]
    );
    const saved = (savedRows as any[])[0];
    console.log('[products.ts] Bundle saved to DB, retrieved:', {
      id: insertResult.insertId,
      bundle_items: saved?.bundle_items,
      bundle_itemsType: typeof saved?.bundle_items,
    });
    
    // Clear products cache
    cache.clear();
    
    res.status(201).json({ id: insertResult.insertId, message: 'Product created successfully' });
  } catch (error) {
    console.error('[products.ts] Error creating product:', error);
    next(error);
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticate, authorize('admin'), updateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid product ID', 400);
    }
    
    // Check if product exists
    const [existing] = await pool.execute('SELECT id FROM products WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      throw new AppError('Product not found', 404);
    }
    const {
      name, price, description, imageUrl, genre, condition, stock,
      tags, platforms, goldCoins, coinExclusive, coinPrice,
      bundleItems, filterValues, discountPercent, youtubeVideoId
    } = req.body;
    
    // Build dynamic UPDATE query - only update fields that are provided
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      values.push(imageUrl);
    }
    if (genre !== undefined) {
      updates.push('genre = ?');
      // Convert array to JSON string if it's an array, otherwise keep as is for backward compatibility
      const genreValue = Array.isArray(genre) ? JSON.stringify(genre) : genre;
      values.push(genreValue);
    }
    if (condition !== undefined) {
      updates.push('`condition` = ?');
      values.push(condition);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      values.push(stock);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(tags ? JSON.stringify(tags) : null);
    }
    if (platforms !== undefined) {
      updates.push('platforms = ?');
      values.push(platforms ? JSON.stringify(platforms) : null);
    }
    if (goldCoins !== undefined) {
      updates.push('gold_coins = ?');
      values.push(goldCoins ?? 0);
    }
    if (coinExclusive !== undefined) {
      updates.push('coin_exclusive = ?');
      values.push(coinExclusive ?? false);
    }
    if (coinPrice !== undefined) {
      updates.push('coin_price = ?');
      values.push(coinPrice ?? 0);
    }
    if (bundleItems !== undefined) {
      updates.push('bundle_items = ?');
      const bundleItemsValue = bundleItems ? JSON.stringify(bundleItems) : null;
      values.push(bundleItemsValue);
      
      // Debug log for bundles
      if (Array.isArray(bundleItems) && bundleItems.length >= 2) {
        console.log('[products.ts] Updating bundle:', {
          id,
          bundleItems,
          bundleItemsValue,
          bundleItemsType: typeof bundleItems,
          isArray: Array.isArray(bundleItems),
        });
      }
    }
    if (filterValues !== undefined) {
      updates.push('filter_values = ?');
      values.push(filterValues ? JSON.stringify(filterValues) : null);
    }
    if (discountPercent !== undefined) {
      updates.push('discount_percent = ?');
      values.push(discountPercent ?? 0);
    }
    if (youtubeVideoId !== undefined) {
      updates.push('youtube_video_id = ?');
      values.push(youtubeVideoId || null);
    }
    
    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }
    
    values.push(id); // Add id for WHERE clause
    
    await pool.execute(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // Verify the updated bundle
    if (bundleItems !== undefined) {
      const [updatedRows] = await pool.execute(
        'SELECT bundle_items FROM products WHERE id = ?',
        [id]
      );
      const updated = (updatedRows as any[])[0];
      console.log('[products.ts] Bundle updated in DB, retrieved:', {
        id,
        bundle_items: updated?.bundle_items,
        bundle_itemsType: typeof updated?.bundle_items,
      });
    }
    
    // Clear products cache
    cache.clear();
    
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', authenticate, authorize('admin'), updateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid product ID', 400);
    }
    
    // Check if product exists
    const [existing] = await pool.execute('SELECT id FROM products WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      throw new AppError('Product not found', 404);
    }
    
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    
    // Clear products cache
    cache.clear();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

