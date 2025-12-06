import crypto from 'crypto';

const BASE64_REGEX = /^[A-Za-z0-9+/=]+$/;

export const encodeBase64 = (value: string) => Buffer.from(value).toString('base64');

export const ensureBase64 = (value: string): string => {
  if (!value) return value;
  if (BASE64_REGEX.test(value) && Buffer.from(value, 'base64').toString('base64') === value) {
    return value;
  }
  return encodeBase64(value);
};

export const buildCreateOrderHash = (params: {
  secretKey: string;
  merchantId: string;
  merchantUser: string;
  merchantOrderId: string;
  orderPrice: number;
  orderCurrency: string;
  orderName: string;
}) => {
  const { secretKey, merchantId, merchantUser, merchantOrderId, orderPrice, orderCurrency, orderName } = params;

  const stringToHash = [
    secretKey,
    merchantId,
    merchantUser,
    merchantOrderId,
    Number(orderPrice).toFixed(2),
    orderCurrency,
    orderName,
  ].join('|');

  return crypto.createHash('sha256').update(stringToHash).digest('hex');
};

export const buildCallbackHash = (params: {
  secretKey: string;
  unipayOrderId: string;
  merchantOrderId: string;
  status: string | number;
}) => {
  const { secretKey, unipayOrderId, merchantOrderId, status } = params;
  const stringToHash = [unipayOrderId, merchantOrderId, status, secretKey].join('|');
  return crypto.createHash('sha256').update(stringToHash).digest('hex');
};

