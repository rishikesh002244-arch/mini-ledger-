import type { Request } from 'express';
import { ApiError } from '../errors/ApiError';

export type ValidationTarget = 'body' | 'query' | 'params';

export const getValidated = <T>(req: Request, target: ValidationTarget): T => {
  const value = req.validated?.[target];

  if (value === undefined) {
    // Programming error, not a client error.
    throw ApiError.internal(`Request ${target} was not validated by middleware`);
  }

  return value as T;
};
