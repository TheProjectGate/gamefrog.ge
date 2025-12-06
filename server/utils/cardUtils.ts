export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'maestro' | 'mir' | 'unknown';

const MASTERCARD_FULL_PATTERN =
  /^(5[1-5][0-9]{0,14}|2(2[2-9][0-9]{0,2}|[3-6][0-9]{1,3}|7([01][0-9]{0,2}|20[0-9]?)))/;

export const normalizeCardNumber = (value: string) =>
  (value || '').replace(/\D/g, '').slice(0, 19);

export const sanitizeExpiry = (value: string) => (value || '').replace(/\D/g, '').slice(0, 4);

export const formatExpiry = (value: string) => {
  const digits = sanitizeExpiry(value);
  if (digits.length === 0) return '';
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

export const detectCardBrand = (value: string): CardBrand => {
  const digits = normalizeCardNumber(value);
  if (!digits) return 'unknown';
  if (/^4[0-9]{0,15}/.test(digits)) return 'visa';
  if (MASTERCARD_FULL_PATTERN.test(digits)) return 'mastercard';
  if (/^3[47][0-9]{0,13}/.test(digits)) return 'amex';
  if (/^6(?:011|5[0-9]{2})[0-9]{0,12}/.test(digits)) return 'discover';
  if (/^(?:5[0678]\d{0,17}|6304|6390|67[0-9]{2})/.test(digits)) return 'maestro';
  if (/^220[0-4][0-9]{0,12}/.test(digits)) return 'mir';
  return 'unknown';
};

export const isExpiryValid = (value: string) => {
  const digits = sanitizeExpiry(value);
  if (digits.length !== 4) return false;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = parseInt(digits.slice(2), 10);
  if (Number.isNaN(month) || Number.isNaN(year)) return false;
  if (month < 1 || month > 12) return false;

  const currentYear = Number(new Date().getFullYear().toString().slice(-2));
  const currentMonth = new Date().getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;

  return true;
};


