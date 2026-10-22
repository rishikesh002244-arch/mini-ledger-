import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { ApiError } from '../common/errors/ApiError';
import { formatZodIssues } from './validate.middleware';
import { removeReceiptFile } from './upload.middleware';

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

interface BodyParserError extends Error {
  status?: number;
  type?: string;
}

const normalizeError = (error: unknown): NormalizedError => {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Please check the highlighted fields and try again.',
      details: formatZodIssues(error),
    };
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: 413,
        code: 'FILE_TOO_LARGE',
        message: `Receipt must be smaller than ${env.MAX_UPLOAD_MB} MB.`,
      };
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return {
        statusCode: 400,
        code: 'UNEXPECTED_FILE',
        message: 'Unexpected file field. Upload the receipt as "receipt".',
      };
    }

    return {
      statusCode: 400,
      code: 'UPLOAD_ERROR',
      message: `Receipt upload failed: ${error.message}`,
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          code: 'CONFLICT',
          message: 'That value already exists.',
          details: error.meta,
        };
      case 'P2025':
        return {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'The requested record does not exist.',
        };
      case 'P2003':
        return {
          statusCode: 400,
          code: 'INVALID_REFERENCE',
          message: 'The request references a record that does not exist.',
        };
      case 'P1001':
      case 'P1002':
        return {
          statusCode: 503,
          code: 'DATABASE_UNAVAILABLE',
          message: 'The database is unreachable. Please try again shortly.',
        };
      default:
        return {
          statusCode: 500,
          code: 'DATABASE_ERROR',
          message: 'A database error occurred.',
        };
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      code: 'INVALID_QUERY',
      message: 'The request could not be understood by the database layer.',
    };
  }

  const maybeBodyParser = error as BodyParserError;
  if (maybeBodyParser?.type === 'entity.too.large' || maybeBodyParser?.status === 413) {
    return {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large.',
    };
  }

  if (error instanceof SyntaxError && maybeBodyParser.status === 400) {
    return {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Request body contains invalid JSON.',
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong on our side. Please try again.',
  };
};

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    ApiError.notFound(
      `Route ${req.method} ${req.originalUrl} does not exist.`,
      'ROUTE_NOT_FOUND',
    ),
  );
};

/** The one place where thrown errors become HTTP responses. */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalizeError(error);

  // Never leave an uploaded receipt behind when the request fails.
  if (req.file) {
    removeReceiptFile(`/uploads/${req.file.filename}`);
  }

  if (normalized.statusCode >= 500) {
    console.error(
      `[${req.requestId}] ${req.method} ${req.originalUrl} → ${normalized.statusCode} ${normalized.code}`,
      error,
    );
  }

  res.status(normalized.statusCode).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details !== undefined ? { details: normalized.details } : {}),
    },
    requestId: req.requestId,
    ...(!env.isProduction && error instanceof Error ? { debug: error.stack } : {}),
  });
};
