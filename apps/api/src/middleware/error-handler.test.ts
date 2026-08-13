import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AppError, notFound } from '../utils/app-error';
import { errorHandler } from './error-handler';

interface CapturedResponse {
  res: Response;
  statusCode: () => number | undefined;
  body: () => unknown;
}

const createResponse = (): CapturedResponse => {
  let statusCode: number | undefined;
  let body: unknown;

  const res = {
    headersSent: false,
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Response;

  return { res, statusCode: () => statusCode, body: () => body };
};

const request = { method: 'GET', originalUrl: '/api/v1/files/abc' } as Request;
const next = vi.fn() as unknown as NextFunction;

describe('errorHandler', () => {
  it('maps an AppError to its status code and error envelope', () => {
    const captured = createResponse();

    errorHandler(notFound('File not found.'), request, captured.res, next);

    expect(captured.statusCode()).toBe(404);
    expect(captured.body()).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'File not found.' },
    });
  });

  it('includes validation details when present', () => {
    const captured = createResponse();
    const error = new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', {
      details: { fieldErrors: { size: ['File is larger than the 25 MB limit.'] } },
    });

    errorHandler(error, request, captured.res, next);

    expect(captured.statusCode()).toBe(400);
    expect(captured.body()).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: { fieldErrors: { size: ['File is larger than the 25 MB limit.'] } },
      },
    });
  });

  it('maps a Prisma "record not found" code to 404', () => {
    const captured = createResponse();

    errorHandler(
      Object.assign(new Error('No FileObject found'), { code: 'P2025' }),
      request,
      captured.res,
      next,
    );

    expect(captured.statusCode()).toBe(404);
    expect(captured.body()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('maps a unique constraint violation to 409', () => {
    const captured = createResponse();

    errorHandler(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
      request,
      captured.res,
      next,
    );

    expect(captured.statusCode()).toBe(409);
    expect(captured.body()).toMatchObject({ error: { code: 'CONFLICT' } });
  });

  it('reports an unexpected error as a 500 without leaking internals in production', async () => {
    vi.resetModules();
    vi.doMock('../utils/logger', () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    process.env.NODE_ENV = 'production';

    try {
      const { errorHandler: productionErrorHandler } = await import('./error-handler');
      const captured = createResponse();

      productionErrorHandler(
        new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secret'),
        request,
        captured.res,
        next,
      );

      expect(captured.statusCode()).toBe(500);
      expect(captured.body()).toEqual({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
    } finally {
      process.env.NODE_ENV = 'test';
      vi.doUnmock('../utils/logger');
      vi.resetModules();
    }
  });
});
