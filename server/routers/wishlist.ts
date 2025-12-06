import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

// GET /api/wishlist/:email - Get user wishlist
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    const conditionCol = 'p.`condition`';
    const [rows] = await pool.execute(
      'SELECT ' +
        'w.product_id as productId, ' +
        'p.id, p.name, p.price, p.description, p.image_url as imageUrl, ' +
        'p.genre, ' + conditionCol + ', p.stock, p.tags, p.platforms, ' +
        'p.gold_coins as goldCoins, p.coin_exclusive as coinExclusive, ' +
        'p.coin_price as coinPrice, p.bundle_items as bundleItems, ' +
        'p.filter_values as filterValues, p.discount_percent as discountPercent, ' +
        'p.wishlist_count as wishlistCount ' +
      'FROM wishlist w ' +
      'JOIN products p ON w.product_id = p.id ' +
      'WHERE w.user_email = ? ' +
      'ORDER BY w.created_at DESC',
      [email]
    );
    
    const products = (rows as any[]).map(item => ({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      description: item.description,
      imageUrl: item.image_url,
      genre: item.genre,
      condition: item.condition,
      stock: item.stock,
      tags: item.tags ? JSON.parse(item.tags) : [],
      platforms: item.platforms ? JSON.parse(item.platforms) : [],
      goldCoins: item.gold_coins,
      coinExclusive: item.coin_exclusive,
      coinPrice: item.coin_price,
      bundleItems: item.bundle_items ? JSON.parse(item.bundle_items) : undefined,
      filterValues: item.filter_values ? JSON.parse(item.filter_values) : undefined,
      discountPercent: item.discount_percent ? parseFloat(item.discount_percent) : undefined,
      wishlistCount: item.wishlist_count,
    }));
    
    res.json(products);
  } catch (error: any) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist', message: error.message });
  }
});

// POST /api/wishlist - Add product to wishlist
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userEmail, productId } = req.body;
    
    if (!userEmail || !productId) {
      return res.status(400).json({ error: 'User email and product ID are required' });
    }
    
    // Check if already in wishlist
    const [existing] = await pool.execute(
      'SELECT id FROM wishlist WHERE user_email = ? AND product_id = ?',
      [userEmail, productId]
    );
    
    if ((existing as any[]).length > 0) {
      return res.status(400).json({ error: 'Product already in wishlist' });
    }
    
    // Add to wishlist
    await pool.execute(
      'INSERT INTO wishlist (user_email, product_id) VALUES (?, ?)',
      [userEmail, productId]
    );
    
    // Update wishlist count
    await pool.execute(
      'UPDATE products SET wishlist_count = wishlist_count + 1 WHERE id = ?',
      [productId]
    );
    
    res.status(201).json({ message: 'Product added to wishlist' });
  } catch (error: any) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ error: 'Failed to add to wishlist', message: error.message });
  }
});

// DELETE /api/wishlist/:email/:productId - Remove product from wishlist
router.delete('/:email/:productId', async (req: Request, res: Response) => {
  try {
    const { email, productId } = req.params;
    
    await pool.execute(
      'DELETE FROM wishlist WHERE user_email = ? AND product_id = ?',
      [email, productId]
    );
    
    // Update wishlist count
    await pool.execute(
      'UPDATE products SET wishlist_count = GREATEST(wishlist_count - 1, 0) WHERE id = ?',
      [productId]
    );
    
    res.json({ message: 'Product removed from wishlist' });
  } catch (error: any) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist', message: error.message });
  }
});

// GET /api/wishlist/check/:email/:productId - Check if product is in wishlist
router.get('/check/:email/:productId', async (req: Request, res: Response) => {
  try {
    const { email, productId } = req.params;
    
    const [rows] = await pool.execute(
      'SELECT id FROM wishlist WHERE user_email = ? AND product_id = ?',
      [email, productId]
    );
    
    res.json({ inWishlist: (rows as any[]).length > 0 });
  } catch (error: any) {
    console.error('Error checking wishlist:', error);
    res.status(500).json({ error: 'Failed to check wishlist', message: error.message });
  }
});

// GET /api/wishlist/users/:productId - Get all users who have product in wishlist
router.get('/users/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    console.log(`[Wishlist API] Fetching users for product ${productId}`);
    
    const [rows] = await pool.execute(
      'SELECT user_email FROM wishlist WHERE product_id = ?',
      [productId]
    );
    
    const emails = (rows as any[]).map(row => row.user_email);
    console.log(`[Wishlist API] Found ${emails.length} users:`, emails);
    res.json({ emails });
  } catch (error: any) {
    console.error('[Wishlist API] Error fetching wishlist users:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist users', message: error.message });
  }
});

export default router;

