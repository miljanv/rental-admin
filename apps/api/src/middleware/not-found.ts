import { API_ERROR_CODES } from '@rental-admin/shared';
import type { RequestHandler } from 'express';

import { buildErrorBody } from '../utils/api-response';

/**
 * Terminal middleware for unmatched routes. Registered without a path because
 * Express 5 no longer accepts a bare `'*'` pattern.
 */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(
    buildErrorBody({
      code: API_ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} does not exist`,
    }),
  );
};
