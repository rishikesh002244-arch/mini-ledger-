import crypto from 'node:crypto';
import { env } from '../../config/env';

export const OTP_LENGTH = 6;

/** Cryptographically random 6-digit code, e.g. "048213". */
export const generateOtp = (): string =>
  crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');

/**
 * OTPs are stored as an HMAC, never in plain text. Binding the hash to the
 * phone number also prevents a code from being replayed on another account.
 */
export const hashOtp = (phone: string, otp: string): string =>
  crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${phone}:${otp}`)
    .digest('hex');

/** Constant-time comparison of two hex digests. */
export const otpMatches = (phone: string, otp: string, storedHash: string): boolean => {
  const candidate = Buffer.from(hashOtp(phone, otp), 'hex');
  const expected = Buffer.from(storedHash, 'hex');

  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
};
