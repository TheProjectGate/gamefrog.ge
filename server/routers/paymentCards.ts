import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../server';
import { AppError } from '../utils/errorHandler';
import {
  CardBrand,
  detectCardBrand,
  formatExpiry,
  normalizeCardNumber,
  sanitizeExpiry,
  isExpiryValid,
} from '../utils/cardUtils';
import { encryptPaymentPayload, decryptPaymentPayload } from '../utils/paymentEncryption';
import { sanitizeString, validateEmail } from '../utils/validation';

const router = Router();

const buildMaskedNumber = (last4: string) => {
  const sanitized = (last4 || '').slice(-4).padStart(4, '•');
  return `•••• •••• •••• ${sanitized}`;
};

const decodeEmail = (value: string) => {
  try {
    return decodeURIComponent(value || '');
  } catch {
    return value || '';
  }
};

type StoredCardPayload = {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
};

const mapRowToResponse = (
  row: any
): {
  id: number;
  cardholderName: string;
  cardType: CardBrand;
  maskedNumber: string;
  last4: string;
  expiry: string;
  fingerprint: string;
  isDefault: boolean;
} => {
  const payload = decryptPaymentPayload<StoredCardPayload>(row.encrypted_payload);
  return {
    id: row.id,
    cardholderName: payload.cardholderName,
    cardType: row.card_brand as CardBrand,
    maskedNumber: buildMaskedNumber(row.card_last4),
    last4: row.card_last4,
    expiry: payload.expiry,
    fingerprint: row.fingerprint,
    isDefault: Boolean(row.is_default),
  };
};

router.get('/:email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = decodeEmail(req.params.email).toLowerCase();
    if (!validateEmail(email)) {
      throw new AppError('A valid email is required.', 400);
    }

    const [rows] = await pool.execute(
      `SELECT id, encrypted_payload, card_brand, card_last4, fingerprint, is_default
       FROM user_payment_cards 
       WHERE user_email = ?
       ORDER BY is_default DESC, updated_at DESC`,
      [email]
    );

    const result = rows as any[];
    res.json(result.map(mapRowToResponse));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, cardholderName, cardNumber, expiry, makeDefault } = req.body ?? {};

    if (!validateEmail(email)) {
      throw new AppError('A valid email is required.', 400);
    }

    const normalizedNumber = normalizeCardNumber(cardNumber || '');
    if (normalizedNumber.length < 12 || normalizedNumber.length > 19) {
      throw new AppError('Card number is invalid.', 400);
    }

    const expiryDigits = sanitizeExpiry(expiry || '');
    if (expiryDigits.length !== 4) {
      throw new AppError('Expiry date must be in MMYY format (4 digits).', 400);
    }
    if (!isExpiryValid(expiryDigits)) {
      // Provide more specific error message
      const month = parseInt(expiryDigits.slice(0, 2), 10);
      const year = parseInt(expiryDigits.slice(2), 10);
      const currentYear = Number(new Date().getFullYear().toString().slice(-2));
      const currentMonth = new Date().getMonth() + 1;
      
      if (month < 1 || month > 12) {
        throw new AppError(`Invalid month: ${month}. Month must be between 01 and 12.`, 400);
      }
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        throw new AppError(`Card has expired. Expiry: ${expiryDigits.slice(0, 2)}/${expiryDigits.slice(2)}, Current: ${String(currentMonth).padStart(2, '0')}/${currentYear}`, 400);
      }
      throw new AppError('Expiry date must be valid and not expired.', 400);
    }

    const formattedExpiry = formatExpiry(expiryDigits);
    const brand = detectCardBrand(normalizedNumber);
    if (brand === 'unknown') {
      throw new AppError('Unsupported card type.', 400);
    }

    const sanitizedHolder = sanitizeString(cardholderName || '').slice(0, 150);
    if (!sanitizedHolder) {
      throw new AppError('Cardholder name is required.', 400);
    }

    const payload: StoredCardPayload = {
      cardholderName: sanitizedHolder,
      cardNumber: normalizedNumber,
      expiry: formattedExpiry,
    };

    let encryptedPayload: string;
    try {
      encryptedPayload = encryptPaymentPayload(payload);
    } catch (encryptError: any) {
      console.error('[paymentCards] Encryption error:', encryptError);
      throw new AppError(
        encryptError.message || 'Failed to encrypt payment data. Please check server configuration.',
        500
      );
    }

    const last4 = normalizedNumber.slice(-4);
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${email.toLowerCase()}::${normalizedNumber}`)
      .digest('hex');

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existingCards] = await connection.execute(
        'SELECT fingerprint FROM user_payment_cards WHERE user_email = ? FOR UPDATE',
        [email.toLowerCase()]
      );

      const hasCards = (existingCards as any[]).length > 0;
      const shouldSetDefault = Boolean(makeDefault) || !hasCards;

      await connection.execute(
        `INSERT INTO user_payment_cards (user_email, encrypted_payload, card_brand, card_last4, fingerprint, is_default)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           encrypted_payload = VALUES(encrypted_payload),
           card_brand = VALUES(card_brand),
           card_last4 = VALUES(card_last4),
           is_default = VALUES(is_default),
           updated_at = CURRENT_TIMESTAMP`,
        [email.toLowerCase(), encryptedPayload, brand, last4, fingerprint, shouldSetDefault ? 1 : 0]
      );

      if (shouldSetDefault) {
        await connection.execute(
          `UPDATE user_payment_cards
           SET is_default = 0
           WHERE user_email = ? AND fingerprint <> ?`,
          [email.toLowerCase(), fingerprint]
        );
      }

      const [savedRows] = await connection.execute(
        `SELECT id, encrypted_payload, card_brand, card_last4, fingerprint, is_default
         FROM user_payment_cards
         WHERE user_email = ? AND fingerprint = ?`,
        [email.toLowerCase(), fingerprint]
      );

      await connection.commit();

      res.json(mapRowToResponse((savedRows as any[])[0]));
    } catch (dbError: any) {
      await connection.rollback();
      console.error('[paymentCards] Database error:', dbError);
      throw new AppError(
        `Failed to save payment card: ${dbError.message || 'Database error'}`,
        500
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/:email/:fingerprint', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = decodeEmail(req.params.email).toLowerCase();
    const fingerprint = req.params.fingerprint;
    if (!validateEmail(email)) {
      throw new AppError('A valid email is required.', 400);
    }
    if (!fingerprint) {
      throw new AppError('Card fingerprint is required.', 400);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [cardRows] = await connection.execute(
        `SELECT is_default FROM user_payment_cards
         WHERE user_email = ? AND fingerprint = ? FOR UPDATE`,
        [email, fingerprint]
      );

      if ((cardRows as any[]).length === 0) {
        await connection.rollback();
        res.status(404).json({ message: 'Card not found.' });
        return;
      }

      const isDefault = Boolean((cardRows as any[])[0].is_default);

      await connection.execute(
        'DELETE FROM user_payment_cards WHERE user_email = ? AND fingerprint = ?',
        [email, fingerprint]
      );

      if (isDefault) {
        const [nextCardRows] = await connection.execute(
          `SELECT fingerprint FROM user_payment_cards
           WHERE user_email = ?
           ORDER BY updated_at DESC
           LIMIT 1`,
          [email]
        );

        if ((nextCardRows as any[]).length > 0) {
          await connection.execute(
            `UPDATE user_payment_cards
             SET is_default = 1
             WHERE user_email = ? AND fingerprint = ?`,
            [email, (nextCardRows as any[])[0].fingerprint]
          );
        }
      }

      await connection.commit();
      res.json({ success: true });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

router.patch('/:email/:fingerprint/default', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = decodeEmail(req.params.email).toLowerCase();
    const fingerprint = req.params.fingerprint;
    if (!validateEmail(email)) {
      throw new AppError('A valid email is required.', 400);
    }
    if (!fingerprint) {
      throw new AppError('Card fingerprint is required.', 400);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [cardRows] = await connection.execute(
        `SELECT id FROM user_payment_cards
         WHERE user_email = ? AND fingerprint = ? FOR UPDATE`,
        [email, fingerprint]
      );

      if ((cardRows as any[]).length === 0) {
        await connection.rollback();
        res.status(404).json({ message: 'Card not found.' });
        return;
      }

      await connection.execute(
        `UPDATE user_payment_cards
         SET is_default = CASE WHEN fingerprint = ? THEN 1 ELSE 0 END
         WHERE user_email = ?`,
        [fingerprint, email]
      );

      await connection.commit();
      res.json({ success: true });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
});

export default router;


