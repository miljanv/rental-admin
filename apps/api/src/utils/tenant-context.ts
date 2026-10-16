import { AsyncLocalStorage } from 'node:async_hooks';

import { organizationRequired } from './app-error';

/**
 * Who is making the current request and which organization's data they may
 * touch. `requireAuth` establishes it once per request; the Prisma tenant
 * extension and the services read it from here, so no service has to thread an
 * `organizationId` argument through every call.
 */
export interface TenantContext {
  userId: string | null;
  /** Null for a SUPERADMIN who has not picked an organization to act in. */
  organizationId: string | null;
}

const storage = new AsyncLocalStorage<TenantContext>();

export const runWithTenant = <T>(context: TenantContext, work: () => T): T =>
  storage.run(context, work);

export const getTenantContext = (): TenantContext | undefined => storage.getStore();

/**
 * The organization every tenant query is currently limited to. Throws instead
 * of returning null so a missing tenant can never fall through to "all data".
 */
export const requireOrganizationId = (): string => {
  const organizationId = storage.getStore()?.organizationId;

  if (!organizationId) {
    throw organizationRequired();
  }

  return organizationId;
};
