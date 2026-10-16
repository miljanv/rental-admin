import { ORGANIZATION_HEADER, type AuthUserDto, type UserRole } from '@rental-admin/shared';
import type { Request, RequestHandler } from 'express';

import { prisma } from '../config/prisma';
import { findActiveAuthUser } from '../services/auth.service';
import { forbidden, notFound, unauthorized } from '../utils/app-error';
import { verifyAccessToken } from '../utils/access-token';
import { runWithTenant } from '../utils/tenant-context';

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
 * The organization whose data this request may read and write. A regular user
 * is always limited to their own. A SUPERADMIN has none by default and acts in
 * one only by naming it in the organization header.
 */
const resolveOrganizationId = async (user: AuthUserDto, req: Request): Promise<string | null> => {
  if (user.role !== 'SUPERADMIN') {
    return user.organizationId;
  }

  const requested = req.header(ORGANIZATION_HEADER)?.trim();

  if (!requested) {
    return null;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: requested },
    select: { id: true },
  });

  if (!organization) {
    throw notFound('Firma nije pronađena.');
  }

  return organization.id;
};

const authenticate = async (
  req: Request,
): Promise<{ user: AuthUserDto; organizationId: string | null }> => {
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    throw unauthorized('Prijavite se da biste nastavili.');
  }

  const subject = verifyAccessToken(token);
  const user = await findActiveAuthUser(subject.id);

  if (!user) {
    throw unauthorized('Sesija je istekla. Prijavite se ponovo.');
  }

  return { user, organizationId: await resolveOrganizationId(user, req) };
};

/**
 * Rejects the request unless `Authorization: Bearer <token>` verifies against
 * JWT_SECRET and the account is still active. Everything that runs after it
 * (controllers, services, Prisma) executes inside the request's tenant
 * context, so business data is limited to one organization automatically.
 * Public routes (health, login) must not mount this middleware.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  authenticate(req).then(
    ({ user, organizationId }) => {
      req.authUser = user;
      runWithTenant({ userId: user.id, organizationId }, () => next());
    },
    (error: unknown) => next(error),
  );
};

/** Allows the request only for the given roles. Mount after `requireAuth`. */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    const user = req.authUser;

    if (!user) {
      next(unauthorized('Prijavite se da biste nastavili.'));
      return;
    }

    if (!roles.includes(user.role)) {
      next(forbidden('Nemate dozvolu za ovu radnju.'));
      return;
    }

    next();
  };

export const currentUser = (req: { authUser?: AuthUserDto }): AuthUserDto => {
  if (!req.authUser) {
    throw unauthorized('Prijavite se da biste nastavili.');
  }

  return req.authUser;
};
