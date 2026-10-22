import 'dotenv/config';
import { z } from 'zod';

/**
 * Every environment variable the API needs is validated once, at boot.
 * A bad/missing value fails fast with a readable message instead of
 * exploding later at request time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required (postgresql://user:pass@host:5432/db)'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),

  CORS_ORIGIN: z.string().default('*'),
  PUBLIC_BASE_URL: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().url('PUBLIC_BASE_URL must be a valid URL (or omit it)').optional(),
  ),

  OTP_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().max(10).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(600)
    .default(30),

  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  isDevelopment: raw.NODE_ENV === 'development',
  /** Public base URL without a trailing slash, if configured. */
  publicBaseUrl: raw.PUBLIC_BASE_URL?.replace(/\/+$/, '') ?? null,
  /** Absolute path to the folder where receipts are stored. */
  uploadsDir: raw.UPLOAD_DIR,
} as const;

export type Env = typeof env;
