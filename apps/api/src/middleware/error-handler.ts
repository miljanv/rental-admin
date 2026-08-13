import { API_ERROR_CODES, type ApiErrorCode } from '@rental-admin/shared';
import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';

import { env } from '../config/env';
import { buildErrorBody } from '../utils/api-response';
import { isAppError } from '../utils/app-error';
import { logger } from '../utils/logger';

interface NormalizedError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

const PRISMA_ERROR_STATUS: Record<string, NormalizedError> = {
  P2025: { statusCode: 404, code: API_ERROR_CODES.NOT_FOUND, message: 'Record not found' },
  P2002: {
    statusCode: 409,
    code: API_ERROR_CODES.CONFLICT,
    message: 'A record with these values already exists',
  },
};

/**
 * Prisma errors are matched structurally so the error handler does not depend on
 * the generated client's exported classes.
 */
const getPrismaErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;

  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
};

const isBodyParserError = (
  error: unknown,
): error is { type: string; status?: number; statusCode?: number } =>
  typeof error === 'object' && error !== null && 'type' in error && 'expose' in error;

const normalize = (error: unknown): NormalizedError => {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof z.ZodError) {
    const flattened = z.flattenError(error);

    return {
      statusCode: 400,
      code: API_ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid request data',
      details: { fieldErrors: flattened.fieldErrors, formErrors: flattened.formErrors },
    };
  }

  const prismaCode = getPrismaErrorCode(error);
  const mappedPrismaError = prismaCode ? PRISMA_ERROR_STATUS[prismaCode] : undefined;

  if (mappedPrismaError) {
    return mappedPrismaError;
  }

  if (isBodyParserError(error)) {
    const status = error.status ?? error.statusCode ?? 400;

    return {
      statusCode: status,
      code: status === 413 ? API_ERROR_CODES.PAYLOAD_TOO_LARGE : API_ERROR_CODES.VALIDATION_ERROR,
      message: status === 413 ? 'Request body is too large' : 'Malformed request body',
    };
  }

  return {
    statusCode: 500,
    code: API_ERROR_CODES.INTERNAL_ERROR,
    message: 'Internal server error',
  };
};

/**
 * Centralized error handler. Unexpected failures are logged in full server-side
 * and reported to the client with a generic message so nothing internal leaks.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const normalized = normalize(error);
  const isUnexpected = normalized.statusCode >= 500;

  const logContext = {
    method: req.method,
    path: req.originalUrl,
    statusCode: normalized.statusCode,
    code: normalized.code,
    ...(isAppError(error) && error.logContext ? error.logContext : {}),
  };

  if (isUnexpected) {
    logger.error('Unhandled request failure', error, logContext);
  } else {
    logger.warn(`Request rejected: ${normalized.message}`, logContext);
  }

  if (res.headersSent) {
    return;
  }

  const exposeMessage = !isUnexpected || !env.isProduction;
  const messageForClient =
    exposeMessage && error instanceof Error && isUnexpected ? error.message : normalized.message;

  res.status(normalized.statusCode).json(
    buildErrorBody({
      code: normalized.code,
      message: messageForClient,
      ...(normalized.details !== undefined ? { details: normalized.details } : {}),
    }),
  );
};
