import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const rateLimitedBody = (message: string) => ({
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message,
  },
});

const common = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  skip: () => env.isTest,
};

/** Broad abuse protection for the whole API. */
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60_000,
  limit: 300,
  message: rateLimitedBody('Too many requests. Please slow down and try again shortly.'),
});

/** OTP sending is expensive-ish and abusable: 8 requests / 10 minutes / IP. */
export const otpRequestLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60_000,
  limit: 8,
  message: rateLimitedBody('Too many OTP requests. Please wait a few minutes.'),
});

/** OTP guessing protection in addition to the per-account attempt counter. */
export const otpVerifyLimiter = rateLimit({
  ...common,
  windowMs: 10 * 60_000,
  limit: 25,
  message: rateLimitedBody('Too many verification attempts. Please wait a few minutes.'),
});
