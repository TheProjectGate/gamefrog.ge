// Validation utilities for API endpoints

export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  return { valid: true };
};

export const validateId = (id: any): boolean => {
  if (id === null || id === undefined) return false;
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  return !isNaN(numId) && numId > 0 && Number.isInteger(numId);
};

export const validateString = (value: any, minLength: number = 0, maxLength: number = 1000): boolean => {
  if (value === null || value === undefined) return minLength === 0;
  if (typeof value !== 'string') return false;
  return value.length >= minLength && value.length <= maxLength;
};

export const validateNumber = (value: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): boolean => {
  if (value === null || value === undefined) return false;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= min && num <= max;
};

export const sanitizeString = (value: string): string => {
  return value.trim().replace(/[<>]/g, '');
};

