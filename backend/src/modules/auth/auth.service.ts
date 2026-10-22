import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../common/errors/ApiError';
import { generateOtp, hashOtp, otpMatches } from '../../common/utils/otp';
import { signAccessToken } from '../../common/utils/jwt';
import { toPublicUser, type PublicUser } from './auth.types';
import type { RequestOtpInput, VerifyOtpInput } from './auth.schemas';

export interface RequestOtpResult {
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /** Returned only outside production so the demo app can show the mock code. */
  devOtp?: string;
}

export interface VerifyOtpResult {
  token: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: PublicUser;
}

const printOtpToConsole = (phone: string, otp: string, expiresAt: Date): void => {
  const line = '─'.repeat(46);
  console.log(
    [
      '',
      `┌${line}┐`,
      '│  MiniLedger · mock OTP                  │',
      `│  Phone : ${phone.padEnd(28)}│`,
      `│  OTP   : ${otp.padEnd(28)}│`,
      `│  Expires: ${expiresAt.toLocaleTimeString().padEnd(26)}│`,
      `└${line}┘`,
      '',
    ].join('\n'),
  );
};

export const authService = {
  async requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
    const { phone } = input;
    const now = new Date();
    const existing = await prisma.user.findUnique({ where: { phone } });

    if (existing?.otpLastSentAt) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - existing.otpLastSentAt.getTime()) / 1000,
      );
      const remaining = env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;

      if (remaining > 0) {
        throw ApiError.tooManyRequests(
          `Please wait ${remaining}s before requesting another OTP.`,
          'OTP_COOLDOWN',
          { retryAfterSeconds: remaining },
        );
      }
    }

    const otp = generateOtp();
    const otpHash = hashOtp(phone, otp);
    const otpExpiresAt = new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000);

    const user = await prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: now,
      },
      update: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        otpLastSentAt: now,
      },
    });

    printOtpToConsole(user.phone, otp, otpExpiresAt);

    return {
      phone: user.phone,
      expiresInSeconds: env.OTP_TTL_SECONDS,
      resendAfterSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      ...(env.isProduction ? {} : { devOtp: otp }),
    };
  },

  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const { phone, otp } = input;
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.otpHash || !user.otpExpiresAt) {
      throw ApiError.badRequest(
        'No active OTP for this number. Request a new code.',
        'OTP_NOT_FOUND',
      );
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
      });
      throw ApiError.badRequest(
        'This OTP has expired. Request a new code.',
        'OTP_EXPIRED',
      );
    }

    if (user.otpAttempts >= env.OTP_MAX_ATTEMPTS) {
      throw ApiError.tooManyRequests(
        'Too many incorrect attempts. Request a new OTP.',
        'OTP_LOCKED',
        { attemptsRemaining: 0 },
      );
    }

    if (!otpMatches(phone, otp, user.otpHash)) {
      const attempts = user.otpAttempts + 1;
      const attemptsRemaining = Math.max(0, env.OTP_MAX_ATTEMPTS - attempts);

      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: attempts },
      });

      throw ApiError.unauthorized(
        attemptsRemaining > 0
          ? `Incorrect OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left.`
          : 'Incorrect OTP. Request a new code.',
        'INVALID_OTP',
        { attemptsRemaining },
      );
    }

    // One-time use: clear the OTP state before returning a token.
    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
    });

    return {
      token: signAccessToken({ sub: user.id, phone: user.phone }),
      tokenType: 'Bearer',
      expiresIn: env.JWT_EXPIRES_IN,
      user: toPublicUser(user),
    };
  },

  async getById(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.unauthorized('This account no longer exists.', 'USER_NOT_FOUND');
    return toPublicUser(user);
  },
};
