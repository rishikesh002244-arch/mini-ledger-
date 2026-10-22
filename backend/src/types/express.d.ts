import type { AuthUser } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth after a valid bearer token is verified. */
      user?: AuthUser;
      /** Correlation id echoed in every response and error. */
      requestId: string;
      /** Zod-parsed payloads, populated by the validate middleware. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
