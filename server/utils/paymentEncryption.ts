import crypto from 'crypto';
import { AppError } from './errorHandler';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended length for GCM
const AUTH_TAG_LENGTH = 16;

let cachedKey: Buffer | null = null;

const getEncryptionKey = (): Buffer => {
  if (cachedKey) return cachedKey;

  const secret = process.env.PAYMENT_DATA_SECRET;
  console.log('[paymentEncryption] PAYMENT_DATA_SECRET check:', {
    exists: !!secret,
    length: secret?.length || 0,
    value: secret ? `${secret.substring(0, 4)}...` : 'undefined'
  });
  
  if (!secret || secret.length < 16) {
    throw new AppError(
      `PAYMENT_DATA_SECRET is not configured or too short (min 16 characters). Current length: ${secret?.length || 0}`,
      500
    );
  }

  cachedKey = crypto.createHash('sha256').update(secret).digest();
  return cachedKey;
};

export const encryptPaymentPayload = (payload: Record<string, unknown>): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const input = Buffer.from(JSON.stringify(payload), 'utf8');

  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptPaymentPayload = <T = Record<string, unknown>>(encoded: string): T => {
  if (!encoded) {
    throw new AppError('Encrypted payload is empty.', 500);
  }

  const raw = Buffer.from(encoded, 'base64');
  if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new AppError('Encrypted payload is malformed.', 500);
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
};


