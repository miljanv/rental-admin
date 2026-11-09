import type { OrganizationUsageDto } from '@rental-admin/shared';

import { prismaUnscoped, type TransactionClient } from '../config/prisma';
import type { Prisma } from '../generated/prisma/client';
import { badRequest, limitReached } from '../utils/app-error';
import { getTenantContext } from '../utils/tenant-context';

/** Users that take a seat in the organization's user limit. */
export const LIMITED_USER_WHERE = { isActive: true, role: 'USER' } as const;

/** Vehicles that take a place in the organization's vehicle limit. */
export const LIMITED_VEHICLE_WHERE = { isEnabled: true } as const;

export type LimitedResource = 'vehicles' | 'users';

interface CountClient {
  user: { count: (args: { where: Prisma.UserWhereInput }) => Promise<number> };
  vehicle: { count: (args: { where: Prisma.VehicleWhereInput }) => Promise<number> };
}

type RawClient = Pick<TransactionClient, '$queryRaw'>;

type LimitClient = CountClient & RawClient;

interface OrganizationLimits {
  maxVehicles: number | null;
  maxUsers: number | null;
}

const LIMIT_MESSAGES: Record<LimitedResource, (max: number) => string> = {
  vehicles: (max) => `Dostignut je limit vozila za firmu (${max}). Obratite se administratoru.`,
  users: (max) => `Dostignut je limit korisnika za firmu (${max}). Obratite se administratoru.`,
};

export const countLimited = (
  client: CountClient,
  organizationId: string,
  resource: LimitedResource,
): Promise<number> =>
  resource === 'vehicles'
    ? client.vehicle.count({ where: { organizationId, ...LIMITED_VEHICLE_WHERE } })
    : client.user.count({ where: { organizationId, ...LIMITED_USER_WHERE } });

/**
 * Locks the organization row for the rest of the transaction, so concurrent creates in the same
 * organization are counted one after another and cannot slip past the limit together.
 */
export const lockOrganizationLimits = async (
  tx: RawClient,
  organizationId: string,
): Promise<OrganizationLimits> => {
  const rows = await tx.$queryRaw<OrganizationLimits[]>`
    SELECT "maxVehicles", "maxUsers" FROM "organizations" WHERE "id" = ${organizationId} FOR UPDATE
  `;
  const limits = rows[0];

  if (!limits) {
    throw badRequest('Izabrana firma ne postoji.');
  }

  return limits;
};

/** Call inside the transaction that adds one more vehicle or active user to the organization. */
export const assertWithinLimit = async (
  tx: LimitClient,
  organizationId: string,
  resource: LimitedResource,
): Promise<void> => {
  const limits = await lockOrganizationLimits(tx, organizationId);
  const max = resource === 'vehicles' ? limits.maxVehicles : limits.maxUsers;

  if (max === null) {
    return;
  }

  if ((await countLimited(tx, organizationId, resource)) >= max) {
    throw limitReached(LIMIT_MESSAGES[resource](max));
  }
};

export const getOrganizationUsage = async (
  organizationId: string | null,
): Promise<OrganizationUsageDto | null> => {
  if (!organizationId) {
    return null;
  }

  const organization = await prismaUnscoped.organization.findUnique({
    where: { id: organizationId },
    select: { maxVehicles: true, maxUsers: true },
  });

  if (!organization) {
    return null;
  }

  const [vehicles, users] = await Promise.all([
    countLimited(prismaUnscoped, organizationId, 'vehicles'),
    countLimited(prismaUnscoped, organizationId, 'users'),
  ]);

  return {
    vehicles,
    maxVehicles: organization.maxVehicles,
    users,
    maxUsers: organization.maxUsers,
  };
};

export const getCurrentOrganizationUsage = (): Promise<OrganizationUsageDto | null> =>
  getOrganizationUsage(getTenantContext()?.organizationId ?? null);
