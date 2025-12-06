import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../server';
import { validateEmail, validatePassword } from '../utils/validation';
import { AppError } from '../utils/errorHandler';
import { generateToken } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/users/register - Register new user
router.post('/register', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password, firstName, lastName, avatar, phone, address } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    
    // Validate email
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.error || 'Invalid password', 400);
    }
    
    // Check if user already exists
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if ((existing as any[]).length > 0) {
      throw new AppError('User with this email already exists', 409);
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, first_name, last_name, avatar, phone, address, gold_coins)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [email, passwordHash, firstName || null, lastName || null, avatar || 0, phone || null, address || null]
    );
    
    const insertResult = result as any;
    const userId = insertResult.insertId;
    
    // Generate JWT token
    const token = generateToken({
      id: userId,
      email,
      role: 'user',
    });
    
    res.status(201).json({
      id: userId,
      email,
      firstName,
      lastName,
      avatar: avatar || 0,
      role: 'user',
      token,
      message: 'User registered successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/login - Login user
router.post('/login', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Find user
    const [rows] = await pool.execute(
      `SELECT id, email, password_hash, first_name, last_name, avatar, role, gold_coins
       FROM users WHERE email = ?`,
      [email]
    );
    
    const users = rows as any[];
    if (users.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }
    
    const user = users[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    });
    
    // Return user data (without password) with token
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatar: user.avatar,
      role: user.role || 'user',
      goldCoins: user.gold_coins,
      token
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/profile/:email - Get user profile
router.get('/profile/:email', async (req: Request, res: Response, next) => {
  try {
    const { email } = req.params;
    
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    const [rows] = await pool.execute(
      `SELECT id, email, first_name, last_name, avatar, phone, address, role, gold_coins, created_at
       FROM users WHERE email = ?`,
      [email]
    );
    
    const users = rows as any[];
    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }
    
    const user = users[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      role: user.role,
      goldCoins: user.gold_coins,
      createdAt: user.created_at
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/profile/:email - Update user profile
router.put('/profile/:email', async (req: Request, res: Response, next) => {
  try {
    const { email } = req.params;
    const { firstName, lastName, avatar, phone, address } = req.body;
    
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    // Check if user is updating their own profile or is admin
    if (req.user && req.user.email !== email && req.user.role !== 'admin') {
      throw new AppError('You can only update your own profile', 403);
    }
    
    await pool.execute(
      `UPDATE users SET first_name = ?, last_name = ?, avatar = ?, phone = ?, address = ?
       WHERE email = ?`,
      [firstName || null, lastName || null, avatar || 0, phone || null, address || null, email]
    );
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/gold-coins/:email - Update user gold coins (admin only)
router.put('/gold-coins/:email', async (req: Request, res: Response, next) => {
  try {
    const { email } = req.params;
    const { goldCoins } = req.body;
    
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    if (typeof goldCoins !== 'number' || goldCoins < 0) {
      throw new AppError('Gold coins must be a non-negative number', 400);
    }
    
    // Only admin can update gold coins
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Only admin can update gold coins', 403);
    }
    
    await pool.execute(
      'UPDATE users SET gold_coins = ? WHERE email = ?',
      [goldCoins, email]
    );
    
    res.json({ message: 'Gold coins updated successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/gold-coins/:email/add - Add gold coins to user balance
router.post('/gold-coins/:email/add', async (req: Request, res: Response, next) => {
  try {
    const { email } = req.params;
    const { amount } = req.body;
    
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400);
    }
    
    if (typeof amount !== 'number' || amount < 0) {
      throw new AppError('Amount must be a non-negative number', 400);
    }
    
    // Add coins to current balance
    await pool.execute(
      'UPDATE users SET gold_coins = gold_coins + ? WHERE email = ?',
      [amount, email]
    );
    
    // Get updated balance
    const [rows] = await pool.execute(
      'SELECT gold_coins FROM users WHERE email = ?',
      [email]
    );
    
    const users = rows as any[];
    const newBalance = users.length > 0 ? users[0].gold_coins : 0;
    
    res.json({ 
      message: 'Gold coins added successfully',
      goldCoins: newBalance
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users - Get all users (admin only)
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name, u.avatar, u.role, u.gold_coins, u.created_at,
        (SELECT COUNT(*) FROM orders WHERE customer_email = u.email) as total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_email = u.email) as total_spent,
        (SELECT COUNT(*) FROM wishlist WHERE user_email = u.email) as wishlist_count
       FROM users u
       ORDER BY u.created_at DESC`
    );
    
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:email - Get user details with full statistics
router.get('/:email', async (req: Request, res: Response, next) => {
  try {
    const { email } = req.params;
    
    // Get user info
    const [userRows] = await pool.execute(
      `SELECT id, email, first_name, last_name, avatar, phone, address, role, gold_coins, created_at
       FROM users WHERE email = ?`,
      [email]
    );
    
    const users = userRows as any[];
    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }
    
    const user = users[0];
    
    // Get orders with items
    const [orders] = await pool.execute(
      `SELECT o.id, o.total, o.status, o.created_at, o.shipping_method, o.delivery_zone, o.tip_amount,
              GROUP_CONCAT(
                CONCAT(oi.product_id, ':', oi.quantity, ':', COALESCE(p.name, 'Unknown'))
                SEPARATOR ';'
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.customer_email = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [email]
    );
    
    // Get wishlist with product details
    const [wishlist] = await pool.execute(
      `SELECT w.product_id, w.created_at, p.name, p.price, p.image_url
       FROM wishlist w
       LEFT JOIN products p ON w.product_id = p.id
       WHERE w.user_email = ?
       ORDER BY w.created_at DESC`,
      [email]
    );
    
    // Get messages
    const [messages] = await pool.execute(
      `SELECT id, subject, body, type, is_read, created_at
       FROM user_messages WHERE user_email = ?
       ORDER BY created_at DESC`,
      [email]
    );
    
    // Get user settings
    const [settings] = await pool.execute(
      `SELECT badge_color_order, badge_color_wishlist, badge_color_general
       FROM user_settings WHERE user_email = ?`,
      [email]
    );
    
    // Calculate statistics
    const totalOrders = (orders as any[]).length;
    const totalSpent = (orders as any[]).reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const wishlistCount = (wishlist as any[]).length;
    
    res.json({
      user,
      orders,
      wishlist,
      messages,
      settings: (settings as any[])[0] || null,
      statistics: {
        totalOrders,
        totalSpent,
        wishlistCount,
        messagesCount: (messages as any[]).length,
        goldCoins: user.gold_coins,
        memberSince: user.created_at,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

