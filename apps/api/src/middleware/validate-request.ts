import { API_ERROR_CODES } from '@rental-admin/shared';
import type { Request, RequestHandler } from 'express';
import { z, type ZodType } from 'zod';

import { AppError } from '../utils/app-error';

export type RequestPart = 'body' | 'query' | 'params';

export interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export type ValidatedStore = Partial<Record<RequestPart, unknown>>;

declare module 'express-serve-static-core' {
  interface Request {
    /** Populated by `validateRequest`; read it through `validated()`. */
    validated?: ValidatedStore;
  }
}

const REQUEST_PARTS: readonly RequestPart[] = ['params', 'query', 'body'];

const toValidationError = (error: z.ZodError, part: RequestPart): AppError => {
  const flattened = z.flattenError(error);

  return new AppError(400, API_ERROR_CODES.VALIDATION_ERROR, 'Invalid request data', {
    details: {
      part,
      fieldErrors: flattened.fieldErrors,
      ...(flattened.formErrors.length > 0 ? { formErrors: flattened.formErrors } : {}),
    },
  });
};

/**
 * Validates the request at the routing boundary. Parsed (coerced, defaulted)
 * values are stored on the request instead of overwriting `req.query`, which is
 * read-only in Express 5.
 */
export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  return (req, _res, next) => {
    const store: ValidatedStore = { ...req.validated };

    for (const part of REQUEST_PARTS) {
      const schema = schemas[part];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[part]);

      if (!result.success) {
        next(toValidationError(result.error, part));
        return;
      }

      store[part] = result.data;
    }

    req.validated = store;
    next();
  };
};

/**
 * Reads a request part that `validateRequest` already parsed.
 *
 * The cast is the single unchecked step in the request pipeline: it is safe
 * because a route always passes the same schema to `validateRequest` as the type
 * argument used here, and `validateRequest` rejects the request otherwise.
 */
export const validated = <TData>(req: Request, part: RequestPart): TData => {
  const value = req.validated?.[part];

  if (value === undefined) {
    throw new Error(`Request part "${part}" was read before it was validated.`);
  }

  return value as TData;
};
