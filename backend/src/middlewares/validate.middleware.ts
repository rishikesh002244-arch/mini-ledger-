import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from '../common/errors/ApiError';
import type { ValidationTarget } from '../common/http/validated';

export interface FieldIssue {
  field: string;
  message: string;
}

export const formatZodIssues = (error: ZodError): FieldIssue[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));

/**
 * Parses the selected part of the request with a Zod schema.
 * On failure the global error handler returns 422 plus per-field messages.
 * Parsed (and transformed) values are stored on req.validated.
 */
export const validate =
  (schema: ZodTypeAny, target: ValidationTarget = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(
        ApiError.unprocessable(
          'Please check the highlighted fields and try again.',
          'VALIDATION_ERROR',
          formatZodIssues(result.error),
        ),
      );
      return;
    }

    req.validated = { ...req.validated, [target]: result.data };
    next();
  };
