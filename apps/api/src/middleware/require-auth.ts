import type { AuthUserDto } from '@rental-admin/shared';
import type { RequestHandler } from 'express';

import { unauthorized } from '../utils/app-error';
import { verifyAccessToken } from '../utils/access-token';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth` after a valid access token is presented. */
    authUser?: AuthUserDto;
  }
}

const readBearerToken = (header: string | undefined): string | null => {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

/**
 * Rejects the request unless `Authorization: Bearer <token>` verifies against
 * JWT_SECRET. Public routes (health, login) must not mount this middleware.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    next(unauthorized('Sign in to continue.'));
    return;
  }

  try {
    req.authUser = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

export const currentUser = (req: { authUser?: AuthUserDto }): AuthUserDto => {
  if (!req.authUser) {
    throw unauthorized('Sign in to continue.');
  }

  return req.authUser;
};
