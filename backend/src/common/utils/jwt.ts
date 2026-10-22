import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../errors/ApiError';

const JWT_ISSUER = 'miniledger-api';
const JWT_AUDIENCE = 'miniledger-app';

export interface AccessTokenPayload {
  sub: string;
  phone: string;
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      typeof decoded === 'string' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.phone !== 'string'
    ) {
      throw new Error('Malformed token payload');
    }

    return { sub: decoded.sub, phone: decoded.phone };
  } catch {
    throw ApiError.unauthorized(
      'Your session is invalid or has expired. Please sign in again.',
      'INVALID_TOKEN',
    );
  }
};
