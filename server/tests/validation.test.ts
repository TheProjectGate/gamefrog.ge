/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'node:test';
import {
  validateEmail,
  validatePassword,
  validateId,
  validateString,
  validateNumber,
} from '../utils/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });

    it('should reject emails longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate correct passwords', () => {
      expect(validatePassword('password123').valid).toBe(true);
      expect(validatePassword('P@ssw0rd!').valid).toBe(true);
      expect(validatePassword('123456').valid).toBe(true);
    });

    it('should reject passwords shorter than 6 characters', () => {
      const result = validatePassword('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('6 characters');
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('128 characters');
    });

    it('should reject empty or null passwords', () => {
      expect(validatePassword('').valid).toBe(false);
      expect(validatePassword(null as any).valid).toBe(false);
      expect(validatePassword(undefined as any).valid).toBe(false);
    });
  });

  describe('validateId', () => {
    it('should validate correct IDs', () => {
      expect(validateId(1)).toBe(true);
      expect(validateId('123')).toBe(true);
      expect(validateId(999999)).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(validateId(0)).toBe(false);
      expect(validateId(-1)).toBe(false);
      expect(validateId('0')).toBe(false);
      expect(validateId('abc')).toBe(false);
      expect(validateId(null)).toBe(false);
      expect(validateId(undefined)).toBe(false);
      expect(validateId('')).toBe(false);
    });
  });

  describe('validateString', () => {
    it('should validate strings within length limits', () => {
      expect(validateString('test', 0, 10)).toBe(true);
      expect(validateString('', 0, 10)).toBe(true);
      expect(validateString('a'.repeat(10), 0, 10)).toBe(true);
    });

    it('should reject strings outside length limits', () => {
      expect(validateString('a'.repeat(11), 0, 10)).toBe(false);
      expect(validateString('test', 5, 10)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(validateString(null, 0, 10)).toBe(true);
      expect(validateString(undefined, 0, 10)).toBe(true);
      expect(validateString(null, 1, 10)).toBe(false);
    });
  });

  describe('validateNumber', () => {
    it('should validate numbers within range', () => {
      expect(validateNumber(5, 0, 10)).toBe(true);
      expect(validateNumber(0, 0, 10)).toBe(true);
      expect(validateNumber(10, 0, 10)).toBe(true);
      expect(validateNumber('5', 0, 10)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(validateNumber(-1, 0, 10)).toBe(false);
      expect(validateNumber(11, 0, 10)).toBe(false);
      expect(validateNumber('abc', 0, 10)).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(validateNumber(null, 0, 10)).toBe(false);
      expect(validateNumber(undefined, 0, 10)).toBe(false);
    });
  });
});

