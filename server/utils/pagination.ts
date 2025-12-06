/**
 * Pagination utilities
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from query
 */
export const parsePagination = (query: any): { page: number; limit: number; offset: number } => {
  const page = Math.max(1, parseInt(query.page as string, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit as string, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Create pagination response
 */
export const createPaginationResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get total count from database
 */
export const getTotalCount = async (
  pool: any,
  table: string,
  whereClause?: string,
  params?: any[]
): Promise<number> => {
  let query = `SELECT COUNT(*) as total FROM ${table}`;
  if (whereClause) {
    query += ` WHERE ${whereClause}`;
  }

  const [rows] = await pool.execute(query, params || []);
  return (rows as any[])[0]?.total || 0;
};

