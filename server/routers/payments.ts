import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errorHandler';
import { ensureBase64, buildCreateOrderHash, buildCallbackHash } from '../utils/unipay';
import { logger } from '../utils/logger';
import { pool } from '../server';
import { authenticate, authorize } from '../middleware/auth';
import {
  getGlobalPaymentTestModeState,
  isGlobalPaymentTestModeEnabled,
  setGlobalPaymentTestMode,
} from '../utils/paymentTestMode';

const router = Router();

// Cache for payment settings (refresh every 5 minutes)
let paymentSettingsCache: {
  [key: string]: { config: any; timestamp: number };
} = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getUniPayConfig = async (): Promise<{
  merchantId: string;
  secretKey: string;
  merchantUser?: string;
  apiUrl: string;
  successUrl?: string;
  cancelUrl?: string;
  callbackUrl?: string;
  isEnabled: boolean;
}> => {
  const cacheKey = 'unipay';
  const cached = paymentSettingsCache[cacheKey];
  
  // Return cached if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config;
  }

  try {
    const [rows] = await pool.execute(
      `SELECT is_enabled, config 
       FROM payment_settings 
       WHERE payment_provider = 'unipay'`
    );

    const settings = rows as any[];
    if (settings.length === 0) {
      throw new AppError('UniPay is not configured. Please configure it in admin settings.', 500);
    }

    const setting = settings[0];
    if (!setting.is_enabled) {
      throw new AppError('UniPay is disabled. Please enable it in admin settings.', 500);
    }

    const config = typeof setting.config === 'string' 
      ? JSON.parse(setting.config) 
      : setting.config;

    if (!config.merchantId || !config.secretKey) {
      throw new AppError('UniPay credentials are not configured. Please set Merchant ID and Secret Key in admin settings.', 500);
    }

    const result = {
      merchantId: config.merchantId,
      secretKey: config.secretKey,
      merchantUser: config.merchantUser || undefined,
      apiUrl: config.apiUrl || 'https://apiv2.unipay.com/custom/checkout/v1',
      successUrl: config.successUrl || undefined,
      cancelUrl: config.cancelUrl || undefined,
      callbackUrl: config.callbackUrl || undefined,
      isEnabled: setting.is_enabled,
    };

    // Update cache
    paymentSettingsCache[cacheKey] = {
      config: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('[UniPay] Failed to load config from database:', error);
    throw new AppError('Failed to load UniPay configuration.', 500);
  }
};

// Clear cache when settings are updated (called from paymentSettings router)
export const clearPaymentSettingsCache = (provider?: string) => {
  if (provider) {
    delete paymentSettingsCache[provider];
  } else {
    paymentSettingsCache = {};
  }
};

const normaliseAmount = (value: number) => parseFloat(Number(value).toFixed(2));

const resolveLanguage = (lang?: string) => {
  if (!lang) return 'EN';
  const upper = lang.toUpperCase();
  return upper === 'GE' || upper === 'EN' ? upper : 'EN';
};

router.post(
  '/unipay/create-order',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        customerEmail,
        merchantUser,
        total,
        currency = 'GEL',
        orderName = 'GameFrog Order',
        orderDescription = '',
        successRedirectUrl,
        cancelRedirectUrl,
        callbackUrl,
        language = 'EN',
        merchantOrderId,
        items,
      } = req.body as {
        customerEmail?: string;
        merchantUser?: string;
        total: number;
        currency?: string;
        orderName?: string;
        orderDescription?: string;
        successRedirectUrl?: string;
        cancelRedirectUrl?: string;
        callbackUrl?: string;
        language?: string;
        merchantOrderId?: string;
        items?: Array<{
          title?: string;
          price?: number;
          quantity?: number;
          description?: string;
          currency?: string;
        }>;
      };

      if (!total || typeof total !== 'number' || total <= 0) {
        throw new AppError('Total amount must be a positive number.', 400);
      }

      const host = req.get('host') || 'localhost';
      const resolvedSuccessUrlParam = successRedirectUrl || `${req.protocol}://${host}/?payment=success`;
      const resolvedCancelUrlParam = cancelRedirectUrl || `${req.protocol}://${host}/?payment=cancel`;
      const resolvedCallbackUrlParam =
        callbackUrl || `${req.protocol}://${host}/api/payments/unipay/callback`;

      const isTestModeEnabled = await isGlobalPaymentTestModeEnabled();
      if (isTestModeEnabled) {
        const simulatedOrderId =
          merchantOrderId ||
          `GF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const simulatedCheckoutUrl = `${resolvedSuccessUrlParam}${
          resolvedSuccessUrlParam.includes('?') ? '&' : '?'
        }simulated-unipay=${encodeURIComponent(simulatedOrderId)}`;

        logger.info(
          `[UniPay][TestMode] Simulating checkout for ${simulatedOrderId}. Redirect=${simulatedCheckoutUrl}`
        );

        return res.json({
          checkoutUrl: simulatedCheckoutUrl,
          unipayOrderHashId: `TEST-${simulatedOrderId}`,
          merchantOrderId: simulatedOrderId,
          message: 'Global payment test mode enabled. No real payment was initiated.',
          testMode: true,
        });
      }

      const config = await getUniPayConfig();
      const resolvedMerchantUser =
        merchantUser || customerEmail || config.merchantUser || 'guest@gamefrog.ge';
      const resolvedOrderId =
        merchantOrderId ||
        `GF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const normalizedPrice = normaliseAmount(total);

      const requestPayload: Record<string, any> = {
        Hash: buildCreateOrderHash({
          secretKey: config.secretKey,
          merchantId: config.merchantId,
          merchantUser: resolvedMerchantUser,
          merchantOrderId: resolvedOrderId,
          orderPrice: normalizedPrice,
          orderCurrency: currency,
          orderName,
        }),
        MerchantID: config.merchantId,
        MerchantUser: resolvedMerchantUser,
        MerchantOrderID: resolvedOrderId,
        OrderPrice: normalizedPrice,
        OrderCurrency: currency,
        SuccessRedirectUrl: ensureBase64(config.successUrl || resolvedSuccessUrlParam),
        CancelRedirectUrl: ensureBase64(config.cancelUrl || resolvedCancelUrlParam),
        CallBackUrl: ensureBase64(config.callbackUrl || resolvedCallbackUrlParam),
        Language: resolveLanguage(language),
        OrderName: orderName,
        OrderDescription: (orderDescription || '').slice(0, 250),
      };

      if (Array.isArray(items) && items.length > 0) {
        requestPayload.Items = items.slice(0, 20).map((item) => ({
          title: item.title?.slice(0, 60) || 'Item',
          price: normaliseAmount(item.price || 0),
          quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
          description: item.description?.slice(0, 120) || '',
          currency: item.currency || currency,
          attribute: '',
        }));
      }

      const response = await fetch(`${config.apiUrl}/createorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json().catch(() => {
        throw new AppError('Failed to parse UniPay response.', 502);
      });

      if (!response.ok || data?.errorcode !== 0) {
        logger.error('[UniPay] createorder failed:', data);
        throw new AppError(
          data?.message || 'UniPay create order request failed.',
          response.status || 502
        );
      }

      const checkoutUrl = data?.data?.Checkout;
      const unipayOrderHashId = data?.data?.UnipayOrderHashID;

      if (!checkoutUrl || !unipayOrderHashId) {
        throw new AppError('UniPay response does not include checkout data.', 502);
      }

      res.json({
        checkoutUrl,
        unipayOrderHashId,
        merchantOrderId: resolvedOrderId,
        message: 'UniPay checkout link generated.',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/test-mode',
  authenticate,
  authorize('admin'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const state = await getGlobalPaymentTestModeState();
      res.json(state);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/test-mode',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { enabled } = req.body ?? {};
      if (typeof enabled !== 'boolean') {
        throw new AppError('Field "enabled" must be a boolean.', 400);
      }
      const state = await setGlobalPaymentTestMode(Boolean(enabled));
      res.json(state);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/unipay/callback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await getUniPayConfig();
      const {
        MerchantOrderID,
        Status,
        Hash,
        UnipayOrderID,
        ErrorCode,
        ErrorMessage,
      } = req.body;

      if (!MerchantOrderID || !UnipayOrderID || !Hash) {
        throw new AppError('UniPay callback payload is incomplete.', 400);
      }

      const expectedHash = buildCallbackHash({
        secretKey: config.secretKey,
        merchantOrderId: String(MerchantOrderID),
        unipayOrderId: String(UnipayOrderID),
        status: Status ?? '',
      });

      if (expectedHash !== Hash) {
        logger.warn('[UniPay] Callback signature mismatch for order', MerchantOrderID);
        throw new AppError('Invalid UniPay callback signature.', 400);
      }

      logger.info(
        `[UniPay] Callback received for order ${MerchantOrderID}: status=${Status}, errorCode=${ErrorCode} message=${ErrorMessage}`
      );

      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


