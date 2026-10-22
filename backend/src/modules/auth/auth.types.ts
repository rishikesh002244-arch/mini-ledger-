import type { User } from '@prisma/client';

/** Attached to req.user after token verification. */
export interface AuthUser {
  id: string;
  phone: string;
}

/** Safe representation of a user — never includes OTP state. */
export interface PublicUser {
  id: string;
  phone: string;
  name: string | null;
  createdAt: string;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  phone: user.phone,
  name: user.name,
  createdAt: user.createdAt.toISOString(),
});
