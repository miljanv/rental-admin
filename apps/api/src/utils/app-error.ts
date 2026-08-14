import { API_ERROR_CODES, type ApiErrorCode } from '@rental-admin/shared';

interface AppErrorOptions {
  details?: unknown;
  cause?: unknown;
  /** Extra context that is logged server-side but never sent to the client. */
  logContext?: Record<string, unknown>;
}

/**
 * Error type that carries the HTTP status and the machine readable code used by
 * the API error envelope. Anything thrown that is not an `AppError` is treated
 * as an unexpected failure and reported generically in production.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  readonly logContext?: Record<string, unknown>;
  readonly isOperational = true;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.logContext = options.logContext;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(400, API_ERROR_CODES.VALIDATION_ERROR, message, options);

export const forbidden = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(403, API_ERROR_CODES.FORBIDDEN, message, options);

export const unauthorized = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(401, API_ERROR_CODES.UNAUTHORIZED, message, options);

export const notFound = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(404, API_ERROR_CODES.NOT_FOUND, message, options);

export const conflict = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(409, API_ERROR_CODES.CONFLICT, message, options);

export const payloadTooLarge = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(413, API_ERROR_CODES.PAYLOAD_TOO_LARGE, message, options);

export const unsupportedMediaType = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(415, API_ERROR_CODES.UNSUPPORTED_MEDIA_TYPE, message, options);

export const uploadNotCompleted = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(409, API_ERROR_CODES.UPLOAD_NOT_COMPLETED, message, options);

export const storageError = (message: string, options?: AppErrorOptions): AppError =>
  new AppError(502, API_ERROR_CODES.STORAGE_ERROR, message, options);

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
