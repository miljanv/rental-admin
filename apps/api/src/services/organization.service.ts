import type {
  DeleteOrganizationResult,
  OrganizationDto,
  OrganizationOverviewDto,
  OrganizationProfileRequest,
  OrganizationWriteRequest,
} from '@rental-admin/shared';

import { prisma, prismaUnscoped } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { isUniqueViolation } from '../utils/prisma-errors';
import { toOrganizationDto, type OrganizationRecord } from '../utils/user-admin-mapper';
import { recordAuditEvent } from './audit.service';
import {
  countLimited,
  LIMITED_USER_WHERE,
  LIMITED_VEHICLE_WHERE,
  lockOrganizationLimits,
} from './organization-limit.service';

/** User and vehicle counts are the ones that count against the organization's limits. */
const organizationInclude = {
  _count: {
    select: {
      users: { where: LIMITED_USER_WHERE },
      vehicles: { where: LIMITED_VEHICLE_WHERE },
      drivers: true,
      trips: true,
    },
  },
} as const;

const NAME_TAKEN_MESSAGE = 'Firma sa tim nazivom već postoji.';

/** Latest sign-in per organization, in one query however many organizations there are. */
const findLastActivity = async (organizationIds: string[]): Promise<Map<string, Date | null>> => {
  const groups = await prismaUnscoped.user.groupBy({
    by: ['organizationId'],
    where: { organizationId: { in: organizationIds } },
    _max: { lastLoginAt: true },
  });

  return new Map(
    groups.flatMap((group) =>
      group.organizationId === null ? [] : [[group.organizationId, group._max.lastLoginAt]],
    ),
  );
};

const toDtoWithActivity = async (record: OrganizationRecord): Promise<OrganizationDto> => {
  const lastActivity = await findLastActivity([record.id]);

  return toOrganizationDto(record, lastActivity.get(record.id) ?? null);
};

export const listOrganizations = async (): Promise<OrganizationDto[]> => {
  const records = await prisma.organization.findMany({
    include: organizationInclude,
    orderBy: { name: 'asc' },
  });
  const lastActivity = await findLastActivity(records.map((record) => record.id));

  return records.map((record) => toOrganizationDto(record, lastActivity.get(record.id) ?? null));
};

export const getOrganization = async (id: string): Promise<OrganizationDto> => {
  const record = await prisma.organization.findUnique({
    where: { id },
    include: organizationInclude,
  });

  if (!record) {
    throw notFound('Firma nije pronađena.');
  }

  return toDtoWithActivity(record);
};

export const createOrganization = async (
  input: OrganizationWriteRequest,
): Promise<OrganizationDto> => {
  try {
    const record = await prisma.organization.create({
      data: {
        name: input.name,
        isActive: input.isActive,
        maxVehicles: input.maxVehicles,
        maxUsers: input.maxUsers,
      },
      include: organizationInclude,
    });
    logger.info('Organization created', { organizationId: record.id, name: record.name });
    await recordAuditEvent({
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: record.id,
      organizationId: record.id,
      metadata: { name: record.name },
    });

    return toOrganizationDto(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(NAME_TAKEN_MESSAGE);
    }

    throw error;
  }
};

const recordOrganizationChanges = async (
  before: OrganizationDto,
  after: {
    id: string;
    name: string;
    isActive: boolean;
    maxVehicles: number | null;
    maxUsers: number | null;
  },
): Promise<void> => {
  const common = {
    entityType: 'Organization' as const,
    entityId: after.id,
    organizationId: after.id,
  };

  if (before.isActive !== after.isActive) {
    await recordAuditEvent({
      ...common,
      action: after.isActive ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_SUSPENDED',
      metadata: { name: after.name },
    });
  }

  if (before.usage.maxVehicles !== after.maxVehicles || before.usage.maxUsers !== after.maxUsers) {
    await recordAuditEvent({
      ...common,
      action: 'ORGANIZATION_LIMITS_CHANGED',
      metadata: {
        name: after.name,
        maxVehicles: { from: before.usage.maxVehicles, to: after.maxVehicles },
        maxUsers: { from: before.usage.maxUsers, to: after.maxUsers },
      },
    });
  }
};

export const updateOrganization = async (
  id: string,
  input: OrganizationWriteRequest,
): Promise<OrganizationDto> => {
  const before = await getOrganization(id);

  try {
    const record = await prismaUnscoped.$transaction(async (tx) => {
      // Locked so nothing is added between the count and the new, lower limit.
      await lockOrganizationLimits(tx, id);
      const [vehicles, users] = await Promise.all([
        countLimited(tx, id, 'vehicles'),
        countLimited(tx, id, 'users'),
      ]);

      if (input.maxVehicles !== null && input.maxVehicles < vehicles) {
        throw conflict(
          `Limit vozila ne može biti manji od trenutnog broja vozila (${vehicles}). Prvo deaktivirajte vozila.`,
        );
      }

      if (input.maxUsers !== null && input.maxUsers < users) {
        throw conflict(
          `Limit korisnika ne može biti manji od broja aktivnih korisnika (${users}). Prvo deaktivirajte korisnike.`,
        );
      }

      return tx.organization.update({
        where: { id },
        data: {
          name: input.name,
          isActive: input.isActive,
          maxVehicles: input.maxVehicles,
          maxUsers: input.maxUsers,
        },
        include: organizationInclude,
      });
    });
    logger.info('Organization updated', {
      organizationId: id,
      isActive: record.isActive,
      maxVehicles: record.maxVehicles,
      maxUsers: record.maxUsers,
    });
    await recordOrganizationChanges(before, record);

    return await toDtoWithActivity(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(NAME_TAKEN_MESSAGE);
    }

    throw error;
  }
};

export const updateOrganizationProfile = async (
  id: string,
  input: OrganizationProfileRequest,
): Promise<OrganizationDto> => {
  await getOrganization(id);

  const record = await prisma.organization.update({
    where: { id },
    data: input,
    include: organizationInclude,
  });
  logger.info('Organization profile updated', { organizationId: id });

  return toDtoWithActivity(record);
};

const countByFlag = (groups: { flag: boolean; count: number }[], flag: boolean): number =>
  groups.find((group) => group.flag === flag)?.count ?? 0;

/** Counts for one organization's detail page, a fixed handful of queries however much it holds. */
export const getOrganizationOverview = async (id: string): Promise<OrganizationOverviewDto> => {
  const organization = await getOrganization(id);
  const where = { organizationId: id };

  const [vehicleGroups, userGroups, drivers, trips, invoices, files] = await Promise.all([
    prismaUnscoped.vehicle.groupBy({ by: ['isEnabled'], where, _count: { _all: true } }),
    prismaUnscoped.user.groupBy({
      by: ['isActive'],
      where: { ...where, role: 'USER' },
      _count: { _all: true },
    }),
    prismaUnscoped.driver.count({ where }),
    prismaUnscoped.trip.count({ where }),
    prismaUnscoped.tripBillingDocument.count({ where: { type: 'RACUN', trip: where } }),
    prismaUnscoped.fileObject.aggregate({
      where: { ...where, status: 'UPLOADED' },
      _count: { _all: true },
      _sum: { size: true },
    }),
  ]);

  const vehicleCounts = vehicleGroups.map((group) => ({
    flag: group.isEnabled,
    count: group._count._all,
  }));
  const userCounts = userGroups.map((group) => ({
    flag: group.isActive,
    count: group._count._all,
  }));

  return {
    organization,
    vehicles: {
      enabled: countByFlag(vehicleCounts, true),
      disabled: countByFlag(vehicleCounts, false),
      max: organization.usage.maxVehicles,
    },
    users: {
      active: countByFlag(userCounts, true),
      inactive: countByFlag(userCounts, false),
      max: organization.usage.maxUsers,
    },
    drivers,
    trips,
    invoices,
    files: files._count._all,
    storageBytes: files._sum.size ?? 0,
  };
};

/**
 * An organization is only deleted while it is empty. Anything it owns would
 * otherwise be orphaned or lost, so a used organization is deactivated instead.
 */
export const deleteOrganization = async (id: string): Promise<DeleteOrganizationResult> => {
  const record = await prismaUnscoped.organization.findUnique({
    where: { id },
    select: {
      name: true,
      _count: {
        select: {
          users: true,
          fileObjects: true,
          drivers: true,
          vehicles: true,
          companyExpenses: true,
          suppliers: true,
          partners: true,
          contracts: true,
          transactions: true,
          tripSeries: true,
          trips: true,
        },
      },
    },
  });

  if (!record) {
    throw notFound('Firma nije pronađena.');
  }

  const used = Object.values(record._count).some((count) => count > 0);

  if (used) {
    throw conflict(
      'Firma ima korisnike ili podatke i ne može se obrisati. Deaktivirajte je umesto toga.',
    );
  }

  // Alarm thresholds are seeded settings, not user data, so they go with it.
  await prismaUnscoped.$transaction([
    prismaUnscoped.alarmThreshold.deleteMany({ where: { organizationId: id } }),
    prismaUnscoped.organization.delete({ where: { id } }),
  ]);
  logger.info('Organization deleted', { organizationId: id });
  // Recorded without the organization: the row it would point to is gone.
  await recordAuditEvent({
    action: 'ORGANIZATION_DELETED',
    entityType: 'Organization',
    entityId: id,
    organizationId: null,
    metadata: { name: record.name },
  });

  return { id, deleted: true };
};
