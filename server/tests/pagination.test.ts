/**
 * Unit tests for pagination utilities
 */

import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  parsePagination,
  createPaginationResponse,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../utils/pagination';

describe('Pagination Utilities', () => {
  describe('parsePagination', () => {
    it('should use default values when no query params provided', () => {
      const result = parsePagination({});
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.offset).toBe(0);
    });

    it('should parse valid page and limit', () => {
      const result = parsePagination({ page: '2', limit: '10' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10);
    });

    it('should enforce minimum page of 1', () => {
      const result = parsePagination({ page: '0', limit: '10' });
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should enforce maximum limit', () => {
      const result = parsePagination({ page: '1', limit: '1000' });
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it('should enforce minimum limit of 1', () => {
      const result = parsePagination({ page: '1', limit: '0' });
      expect(result.limit).toBe(1);
    });

    it('should calculate offset correctly', () => {
      const result1 = parsePagination({ page: '1', limit: '20' });
      expect(result1.offset).toBe(0);

      const result2 = parsePagination({ page: '3', limit: '20' });
      expect(result2.offset).toBe(40);
    });
  });

  describe('createPaginationResponse', () => {
    it('should create correct pagination response', () => {
      const data = [1, 2, 3, 4, 5];
      const total = 25;
      const page = 2;
      const limit = 5;

      const result = createPaginationResponse(data, total, page, limit);

      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(page);
      expect(result.pagination.limit).toBe(limit);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should handle first page correctly', () => {
      const result = createPaginationResponse([1, 2], 10, 1, 5);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('should handle last page correctly', () => {
      const result = createPaginationResponse([6, 7], 7, 2, 5);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('should handle single page correctly', () => {
      const result = createPaginationResponse([1, 2, 3], 3, 1, 5);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});

