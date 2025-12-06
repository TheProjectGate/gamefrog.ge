import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server';
import { validateId, validateEmail } from '../utils/validation';
import { AppError } from '../utils/errorHandler';
import { authenticate, optionalAuth, authorize } from '../middleware/auth';
import { apiLimiter, createLimiter, updateLimiter } from '../middleware/rateLimiter';
import { parsePagination, createPaginationResponse, getTotalCount } from '../utils/pagination';

const router = Router();

// GET /api/orders - Get all orders (admin) or user orders with pagination
router.get('/', optionalAuth, apiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    
    // If user is not admin, they can only see their own orders
    if (req.user && req.user.role !== 'admin') {
      if (!email || email !== req.user.email) {
        throw new AppError('You can only view your own orders', 403);
      }
    }
    
    let query = `
      SELECT 
        o.id, o.customer_email as customerEmail, o.total, o.status,
        o.shipping_method as shippingMethod, o.delivery_zone as deliveryZone,
        o.tip_amount as tipAmount, o.created_at as createdAt, o.updated_at as updatedAt
      FROM orders o
    `;
    const params: any[] = [];
    
    if (email) {
      query += ' WHERE o.customer_email = ?';
      params.push(email);
    }
    
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders o';
    const countParams: any[] = [];
    if (email) {
      countQuery += ' WHERE o.customer_email = ?';
      countParams.push(email);
    }
    const total = await getTotalCount(pool, 'orders', email ? 'customer_email = ?' : undefined, countParams);
    
    const [rows] = await pool.execute(query, params);
    const orders = rows as any[];
    
    // Fetch order items for each order
    const conditionCol = 'p.`condition`';
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await pool.execute(
          'SELECT ' +
            'oi.id, oi.product_id as productId, oi.quantity, oi.price, ' +
            'p.id, p.name, p.description, p.image_url as imageUrl, ' +
            'p.genre, ' + conditionCol + ', p.stock, p.tags, p.platforms, ' +
            'p.gold_coins as goldCoins, p.coin_exclusive as coinExclusive, ' +
            'p.coin_price as coinPrice, p.bundle_items as bundleItems, ' +
            'p.filter_values as filterValues, p.discount_percent as discountPercent ' +
          'FROM order_items oi ' +
          'JOIN products p ON oi.product_id = p.id ' +
          'WHERE oi.order_id = ?',
          [order.id]
        );
        
        const products = (items as any[]).map(item => ({
          id: item.productId,
          name: item.name,
          price: parseFloat(item.price),
          description: item.description,
          imageUrl: item.imageUrl,
          genre: item.genre,
          condition: item.condition,
          stock: item.stock,
          tags: item.tags ? JSON.parse(item.tags) : [],
          platforms: item.platforms ? JSON.parse(item.platforms) : [],
          goldCoins: item.goldCoins,
          coinExclusive: item.coinExclusive,
          coinPrice: item.coinPrice,
          bundleItems: item.bundleItems ? JSON.parse(item.bundleItems) : undefined,
          filterValues: item.filterValues ? JSON.parse(item.filterValues) : undefined,
          discountPercent: item.discountPercent ? parseFloat(item.discountPercent) : undefined,
        }));
        
        return {
          ...order,
          products,
          total: parseFloat(order.total),
          tipAmount: order.tipAmount ? parseFloat(order.tipAmount) : undefined,
        };
      })
    );
    
    const response = createPaginationResponse(ordersWithItems, total, page, limit);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    
    if (!validateId(id)) {
      throw new AppError('Invalid order ID', 400);
    }
    
    const [rows] = await pool.execute(
      `SELECT 
        id, customer_email as customerEmail, total, status,
        shipping_method as shippingMethod, delivery_zone as deliveryZone,
        tip_amount as tipAmount, created_at as createdAt, updated_at as updatedAt
      FROM orders WHERE id = ?`,
      [id]
    );
    
    const orders = rows as any[];
    if (orders.length === 0) {
      throw new AppError('Order not found', 404);
    }
    
    const order = orders[0];
    
    // Fetch order items
    const conditionCol = 'p.`condition`';
    const [items] = await pool.execute(
      'SELECT ' +
        'oi.id, oi.product_id as productId, oi.quantity, oi.price, ' +
        'p.id, p.name, p.description, p.image_url as imageUrl, ' +
        'p.genre, ' + conditionCol + ', p.stock, p.tags, p.platforms, ' +
        'p.gold_coins as goldCoins, p.coin_exclusive as coinExclusive, ' +
        'p.coin_price as coinPrice, p.bundle_items as bundleItems, ' +
        'p.filter_values as filterValues, p.discount_percent as discountPercent ' +
      'FROM order_items oi ' +
      'JOIN products p ON oi.product_id = p.id ' +
      'WHERE oi.order_id = ?',
      [id]
    );
    
    const products = (items as any[]).map(item => ({
      id: item.productId,
      name: item.name,
      price: parseFloat(item.price),
      description: item.description,
      imageUrl: item.imageUrl,
      genre: item.genre,
      condition: item.condition,
      stock: item.stock,
      tags: item.tags ? JSON.parse(item.tags) : [],
      platforms: item.platforms ? JSON.parse(item.platforms) : [],
      goldCoins: item.goldCoins,
      coinExclusive: item.coinExclusive,
      coinPrice: item.coinPrice,
      bundleItems: item.bundleItems ? JSON.parse(item.bundleItems) : undefined,
      filterValues: item.filterValues ? JSON.parse(item.filterValues) : undefined,
      discountPercent: item.discountPercent ? parseFloat(item.discountPercent) : undefined,
    }));
    
    res.json({
      ...order,
      products,
      total: parseFloat(order.total),
      tipAmount: order.tipAmount ? parseFloat(order.tipAmount) : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders - Create new order
router.post('/', optionalAuth, createLimiter, async (req: Request, res: Response, next) => {
  try {
    const {
      customerEmail,
      products,
      total,
      shippingMethod,
      deliveryZone,
      tipAmount
    } = req.body;
    
    if (!customerEmail || !products || !Array.isArray(products) || products.length === 0) {
      throw new AppError('Customer email and products are required', 400);
    }
    
    if (!validateEmail(customerEmail)) {
      throw new AppError('Invalid email format', 400);
    }
    
    // If user is authenticated, verify they're creating order for themselves
    if (req.user && req.user.email !== customerEmail && req.user.role !== 'admin') {
      throw new AppError('You can only create orders for yourself', 403);
    }
    
    if (typeof total !== 'number' || total < 0) {
      throw new AppError('Total must be a non-negative number', 400);
    }
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create order
      const [orderResult] = await connection.execute(
        `INSERT INTO orders (customer_email, total, status, shipping_method, delivery_zone, tip_amount)
         VALUES (?, ?, 'pending', ?, ?, ?)`,
        [customerEmail, total, shippingMethod || null, deliveryZone || null, tipAmount || 0]
      );
      
      const orderId = (orderResult as any).insertId;
      
      // Create order items
      for (const product of products) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES (?, ?, 1, ?)`,
          [orderId, product.id, product.price]
        );
      }
      
      // Update user gold coins if products have goldCoins
      const totalGoldCoins = products.reduce((sum: number, p: any) => sum + (p.goldCoins || 0), 0);
      if (totalGoldCoins > 0) {
        const [userRows] = await connection.execute(
          'SELECT gold_coins FROM users WHERE email = ?',
          [customerEmail]
        );
        
        if ((userRows as any[]).length > 0) {
          const currentCoins = (userRows as any[])[0].gold_coins;
          await connection.execute(
            'UPDATE users SET gold_coins = ? WHERE email = ?',
            [currentCoins + totalGoldCoins, customerEmail]
          );
        }
      }
      
      await connection.commit();
      connection.release();
      
      res.status(201).json({ id: orderId, message: 'Order created successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// PUT /api/orders/:id/status - Update order status (admin only)
router.put('/:id/status', authenticate, authorize('admin'), updateLimiter, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!validateId(id)) {
      throw new AppError('Invalid order ID', 400);
    }
    
    if (!['pending', 'delivered', 'cancelled'].includes(status)) {
      throw new AppError('Invalid status. Must be one of: pending, delivered, cancelled', 400);
    }
    
    // Check if order exists
    const [existing] = await pool.execute('SELECT id FROM orders WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      throw new AppError('Order not found', 404);
    }
    
    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

