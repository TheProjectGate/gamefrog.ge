import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

// POST /api/analytics/product-views - Track product view
router.post('/product-views', async (req: Request, res: Response) => {
  try {
    const { productId, customerEmail } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    await pool.execute(
      'INSERT INTO product_views (product_id, customer_email) VALUES (?, ?)',
      [productId, customerEmail || null]
    );
    
    res.status(201).json({ message: 'Product view tracked' });
  } catch (error: any) {
    console.error('Error tracking product view:', error);
    res.status(500).json({ error: 'Failed to track product view', message: error.message });
  }
});

// GET /api/analytics/product-views - Get product views
router.get('/product-views', async (req: Request, res: Response) => {
  try {
    const { productId, customerEmail } = req.query;
    
    let query = 'SELECT id, product_id as productId, customer_email as customerEmail, timestamp FROM product_views WHERE 1=1';
    const params: any[] = [];
    
    if (productId) {
      query += ' AND product_id = ?';
      params.push(productId);
    }
    
    if (customerEmail) {
      query += ' AND customer_email = ?';
      params.push(customerEmail);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching product views:', error);
    res.status(500).json({ error: 'Failed to fetch product views', message: error.message });
  }
});

// POST /api/analytics/category-times - Track category time
router.post('/category-times', async (req: Request, res: Response) => {
  try {
    const { categoryId, categoryName, timeSpent, customerEmail } = req.body;
    
    if (!categoryId || !categoryName || !timeSpent) {
      return res.status(400).json({ error: 'Category ID, name and time spent are required' });
    }
    
    await pool.execute(
      `INSERT INTO category_times (category_id, category_name, time_spent, customer_email)
       VALUES (?, ?, ?, ?)`,
      [categoryId, categoryName, timeSpent, customerEmail || null]
    );
    
    res.status(201).json({ message: 'Category time tracked' });
  } catch (error: any) {
    console.error('Error tracking category time:', error);
    res.status(500).json({ error: 'Failed to track category time', message: error.message });
  }
});

// GET /api/analytics/category-times - Get category times
router.get('/category-times', async (req: Request, res: Response) => {
  try {
    const { categoryId, customerEmail } = req.query;
    
    let query = `
      SELECT id, category_id as categoryId, category_name as categoryName,
        time_spent as timeSpent, customer_email as customerEmail, timestamp
      FROM category_times
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }
    
    if (customerEmail) {
      query += ' AND customer_email = ?';
      params.push(customerEmail);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching category times:', error);
    res.status(500).json({ error: 'Failed to fetch category times', message: error.message });
  }
});

// GET /api/analytics/stats - Get analytics statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Total products
    const [productCount] = await pool.execute('SELECT COUNT(*) as count FROM products');
    const totalProducts = (productCount as any[])[0].count;
    
    // Total orders
    const [orderCount] = await pool.execute('SELECT COUNT(*) as count FROM orders');
    const totalOrders = (orderCount as any[])[0].count;
    
    // Total revenue
    const [revenue] = await pool.execute('SELECT SUM(total) as total FROM orders WHERE status = "delivered"');
    const totalRevenue = (revenue as any[])[0].total || 0;
    
    // Total users
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = (userCount as any[])[0].count;
    
    // Total product views
    const [viewCount] = await pool.execute('SELECT COUNT(*) as count FROM product_views');
    const totalViews = (viewCount as any[])[0].count;
    
    // Most viewed products
    const [mostViewed] = await pool.execute(
      `SELECT p.id, p.name, COUNT(pv.id) as viewCount
       FROM products p
       LEFT JOIN product_views pv ON p.id = pv.product_id
       GROUP BY p.id, p.name
       ORDER BY viewCount DESC
       LIMIT 10`
    );
    
    // Most wishlisted products
    const [mostWishlisted] = await pool.execute(
      `SELECT p.id, p.name, p.wishlist_count as wishlistCount
       FROM products p
       ORDER BY p.wishlist_count DESC
       LIMIT 10`
    );
    
    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue),
      totalUsers,
      totalViews,
      mostViewed,
      mostWishlisted,
    });
  } catch (error: any) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics stats', message: error.message });
  }
});

export default router;

