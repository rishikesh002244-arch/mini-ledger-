import type { Request, RequestHandler } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { verifyAccessToken } from '../common/utils/jwt';
import type { AuthUser } from '../modules/auth/auth.types';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    next(
      ApiError.unauthorized(
        'Missing bearer token. Sign in to continue.',
        'MISSING_TOKEN',
      ),
    );
    return;
  }

  const token = header.slice(7).trim();
  if (!token) {
    next(ApiError.unauthorized('Missing bearer token. Sign in to continue.', 'MISSING_TOKEN'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, phone: payload.phone };
    next();
  } catch (error) {
    next(error);
  }
};

/** Use in controllers that sit behind requireAuth. */
export const getAuthUser = (req: Request): AuthUser => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};
