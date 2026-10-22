import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Every successful response has the same envelope. */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown> | PaginationMeta,
  statusCode = 200,
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
};
