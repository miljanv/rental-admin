import { DRIVER_ACCESS_HEADER } from '@rental-admin/shared';
import type { RequestHandler } from 'express';

import { findDriverAccess, type DriverAccess } from '../services/driver-access.service';
import { driverLinkInvalid } from '../utils/app-error';
import { runWithTenant } from '../utils/tenant-context';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireDriverToken` for a valid driver portal link. */
    driverAccess?: DriverAccess;
  }
}

/**
 * Lets a request through only with a valid personal driver link in the
 * `X-Driver-Token` header. Everything after it runs in the driver's
 * organization, with no signed-in user.
 */
export const requireDriverToken: RequestHandler = (req, _res, next) => {
  const token = req.header(DRIVER_ACCESS_HEADER)?.trim() ?? '';

  findDriverAccess(token).then(
    (access) => {
      if (!access) {
        next(driverLinkInvalid());
        return;
      }

      req.driverAccess = access;
      runWithTenant({ userId: null, organizationId: access.organizationId }, () => next());
    },
    (error: unknown) => next(error),
  );
};

export const currentDriverAccess = (req: { driverAccess?: DriverAccess }): DriverAccess => {
  if (!req.driverAccess) {
    throw driverLinkInvalid();
  }

  return req.driverAccess;
};
