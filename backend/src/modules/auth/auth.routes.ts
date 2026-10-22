import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { otpRequestLimiter, otpVerifyLimiter } from '../../middlewares/rateLimit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as authController from './auth.controller';
import { requestOtpSchema, verifyOtpSchema } from './auth.schemas';

const router = Router();

/**
 * POST /api/auth/request-otp
 * Body: { phone }
 * Generates a 6-digit mock OTP, prints it to the server console and stores
 * only its HMAC on the user row.
 */
router.post(
  '/request-otp',
  otpRequestLimiter,
  validate(requestOtpSchema),
  authController.requestOtp,
);

/**
 * POST /api/auth/verify-otp
 * Body: { phone, otp }
 * Exchanges a valid OTP for a JWT access token.
 */
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp,
);

/** GET /api/auth/me — profile for the bearer token. */
router.get('/me', requireAuth, authController.me);

export default router;
