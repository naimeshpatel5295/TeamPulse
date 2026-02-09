import { Request } from 'express';
import { PAGINATION, IPaginationQuery, IPaginatedResponse } from '@teampulse/shared';

export function parsePaginationQuery(req: Request): IPaginationQuery {
  const page = Math.max(1, parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT)
  );
  const sortBy = (req.query.sortBy as string) || 'created_at';
  const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

  return { page, limit, sortBy, sortOrder };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: IPaginationQuery
): IPaginatedResponse<T> {
  const page = pagination.page || PAGINATION.DEFAULT_PAGE;
  const limit = pagination.limit || PAGINATION.DEFAULT_LIMIT;

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function getOffset(pagination: IPaginationQuery): number {
  const page = pagination.page || PAGINATION.DEFAULT_PAGE;
  const limit = pagination.limit || PAGINATION.DEFAULT_LIMIT;
  return (page - 1) * limit;
}
