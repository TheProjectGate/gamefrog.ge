import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server';
import { AppError } from '../utils/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../utils/logger';

const DEFAULT_PAYMENT_PROVIDERS: Record<
  string,
  {
    displayName: string;
    config: any;
  }
> = {
  unipay: {
    displayName: 'UniPay',
    config: {
      merchantId: '',
      secretKey: '',
      merchantUser: '',
      apiUrl: 'https://apiv2.unipay.com/custom/checkout/v1',
      successUrl: '',
      cancelUrl: '',
      callbackUrl: '',
    },
  },
  googlepay: {
    displayName: 'Google Pay',
    config: {
      merchantId: '',
      gateway: 'example',
      gatewayMerchantId: '',
      environment: 'TEST',
      buttonColor: 'black',
      buttonType: 'buy',
    },
  },
};

let defaultsEnsured = false;

const ensureDefaultPaymentProviders = async () => {
  if (defaultsEnsured) return;
  const [rows] = await pool.execute(
    'SELECT payment_provider as paymentProvider FROM payment_settings'
  );
  const existing = new Set((rows as any[]).map(row => row.paymentProvider));
  const missing = Object.entries(DEFAULT_PAYMENT_PROVIDERS).filter(
    ([provider]) => !existing.has(provider)
  );

  for (const [provider, data] of missing) {
    await pool.execute(
      `INSERT INTO payment_settings (payment_provider, is_enabled, display_name, config)
       VALUES (?, false, ?, ?)`,
      [provider, data.displayName, JSON.stringify(data.config)]
    );
    logger.info(`[PaymentSettings] Seeded default provider: ${provider}`);
  }
  defaultsEnsured = true;
};

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.use(async (_req, _res, next) => {
  try {
    await ensureDefaultPaymentProviders();
    next();
  } catch (error) {
    next(error);
  }
});

// GET /api/payment-settings - Get all payment settings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        id,
        payment_provider as paymentProvider,
        is_enabled as isEnabled,
        display_name as displayName,
        config,
        created_at as createdAt,
        updated_at as updatedAt
      FROM payment_settings
      ORDER BY payment_provider ASC`
    );

    const settings = (rows as any[]).map(row => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    }));

    res.json(settings);
  } catch (error: any) {
    next(new AppError('Failed to fetch payment settings.', 500));
  }
});

// GET /api/payment-settings/:provider - Get specific payment provider settings
router.get('/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;

    const [rows] = await pool.execute(
      `SELECT 
        id,
        payment_provider as paymentProvider,
        is_enabled as isEnabled,
        display_name as displayName,
        config,
        created_at as createdAt,
        updated_at as updatedAt
      FROM payment_settings
      WHERE payment_provider = ?`,
      [provider]
    );

    const settings = rows as any[];
    if (settings.length === 0) {
      throw new AppError(`Payment provider '${provider}' not found.`, 404);
    }

    const setting = settings[0];
    setting.config = typeof setting.config === 'string' ? JSON.parse(setting.config) : setting.config;

    res.json(setting);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Failed to fetch payment settings.', 500));
    }
  }
});

// PUT /api/payment-settings/:provider - Update payment provider settings
router.put('/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const { isEnabled, displayName, config } = req.body;

    // Validate required fields
    if (config === undefined) {
      throw new AppError('Config is required.', 400);
    }

    // Check if provider exists
    const [existing] = await pool.execute(
      'SELECT id FROM payment_settings WHERE payment_provider = ?',
      [provider]
    );

    if ((existing as any[]).length === 0) {
      throw new AppError(`Payment provider '${provider}' not found.`, 404);
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (isEnabled !== undefined) {
      updates.push('is_enabled = ?');
      values.push(isEnabled);
    }

    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }

    if (config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(config));
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update.', 400);
    }

    values.push(provider);

    await pool.execute(
      `UPDATE payment_settings 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE payment_provider = ?`,
      values
    );

    logger.info(`[PaymentSettings] Updated settings for provider: ${provider}`);
    
    // Clear cache for this provider (dynamic import to avoid circular dependency)
    try {
      const paymentsModule = await import('./payments');
      if (paymentsModule.clearPaymentSettingsCache) {
        paymentsModule.clearPaymentSettingsCache(provider);
      }
    } catch (error) {
      // If import fails, just log - cache will expire naturally
      logger.warn('[PaymentSettings] Could not clear cache, will expire naturally');
    }

    // Return updated settings
    const [updated] = await pool.execute(
      `SELECT 
        id,
        payment_provider as paymentProvider,
        is_enabled as isEnabled,
        display_name as displayName,
        config,
        created_at as createdAt,
        updated_at as updatedAt
      FROM payment_settings
      WHERE payment_provider = ?`,
      [provider]
    );

    const setting = (updated as any[])[0];
    setting.config = typeof setting.config === 'string' ? JSON.parse(setting.config) : setting.config;

    res.json(setting);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('[PaymentSettings] Update error:', error);
      next(new AppError('Failed to update payment settings.', 500));
    }
  }
});

// POST /api/payment-settings - Create new payment provider settings
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentProvider, isEnabled = false, displayName, config } = req.body;

    if (!paymentProvider || !displayName || !config) {
      throw new AppError('paymentProvider, displayName, and config are required.', 400);
    }

    // Check if provider already exists
    const [existing] = await pool.execute(
      'SELECT id FROM payment_settings WHERE payment_provider = ?',
      [paymentProvider]
    );

    if ((existing as any[]).length > 0) {
      throw new AppError(`Payment provider '${paymentProvider}' already exists. Use PUT to update.`, 409);
    }

    await pool.execute(
      `INSERT INTO payment_settings (payment_provider, is_enabled, display_name, config)
       VALUES (?, ?, ?, ?)`,
      [paymentProvider, isEnabled, displayName, JSON.stringify(config)]
    );

    logger.info(`[PaymentSettings] Created new payment provider: ${paymentProvider}`);

    // Return created settings
    const [created] = await pool.execute(
      `SELECT 
        id,
        payment_provider as paymentProvider,
        is_enabled as isEnabled,
        display_name as displayName,
        config,
        created_at as createdAt,
        updated_at as updatedAt
      FROM payment_settings
      WHERE payment_provider = ?`,
      [paymentProvider]
    );

    const setting = (created as any[])[0];
    setting.config = typeof setting.config === 'string' ? JSON.parse(setting.config) : setting.config;

    res.status(201).json(setting);
  } catch (error: any) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('[PaymentSettings] Create error:', error);
      next(new AppError('Failed to create payment settings.', 500));
    }
  }
});

export default router;

