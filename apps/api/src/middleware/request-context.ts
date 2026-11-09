import type { RequestHandler } from 'express';

import { runWithRequestContext } from '../utils/request-context';

/** Remembers the client IP and user agent for everything that runs during the request. */
export const requestContext: RequestHandler = (req, _res, next) => {
  runWithRequestContext(
    { ip: req.ip ?? null, userAgent: req.get('user-agent')?.slice(0, 300) ?? null },
    () => next(),
  );
};
