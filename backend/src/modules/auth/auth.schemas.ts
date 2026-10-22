import { z } from 'zod';
import { isValidNormalizedPhone, normalizePhone } from '../../common/utils/phone';

const phoneSchema = z
  .string({
    required_error: 'Phone number is required',
    invalid_type_error: 'Phone number must be text',
  })
  .trim()
  .min(6, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .transform(normalizePhone)
  .refine(isValidNormalizedPhone, {
    message: 'Enter a valid phone number, e.g. +91 98765 43210',
  });

export const requestOtpSchema = z
  .object({
    phone: phoneSchema,
  })
  .strict();

export const verifyOtpSchema = z
  .object({
    phone: phoneSchema,
    otp: z
      .string({
        required_error: 'OTP is required',
      })
      .trim()
      .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  })
  .strict();

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
