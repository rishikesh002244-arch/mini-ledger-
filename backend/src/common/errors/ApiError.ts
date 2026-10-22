/**
 * The single error type thrown by controllers/services.
 * The global error handler turns it into a consistent JSON response.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code = 'API_ERROR',
    details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED', details?: unknown) {
    return new ApiError(401, message, code, details);
  }

  static forbidden(message = 'You do not have access to this resource', code = 'FORBIDDEN', details?: unknown) {
    return new ApiError(403, message, code, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details?: unknown) {
    return new ApiError(404, message, code, details);
  }

  static conflict(message: string, code = 'CONFLICT', details?: unknown) {
    return new ApiError(409, message, code, details);
  }

  static payloadTooLarge(message = 'Uploaded file is too large', code = 'FILE_TOO_LARGE', details?: unknown) {
    return new ApiError(413, message, code, details);
  }

  static unprocessable(message = 'Validation failed', code = 'VALIDATION_ERROR', details?: unknown) {
    return new ApiError(422, message, code, details);
  }

  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED', details?: unknown) {
    return new ApiError(429, message, code, details);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE', details?: unknown) {
    return new ApiError(503, message, code, details);
  }

  static internal(message = 'Something went wrong', details?: unknown) {
    return new ApiError(500, message, 'INTERNAL_SERVER_ERROR', details, false);
  }
}
