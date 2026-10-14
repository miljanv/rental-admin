import type {
  DeleteOrganizationResult,
  OrganizationDto,
  OrganizationWriteRequest,
} from '@rental-admin/shared';

import { prisma, prismaUnscoped } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { isUniqueViolation } from '../utils/prisma-errors';
import { toOrganizationDto } from '../utils/user-admin-mapper';

const organizationInclude = {
  _count: { select: { users: true, vehicles: true, drivers: true, trips: true } },
} as const;

const NAME_TAKEN_MESSAGE = 'Firma sa tim nazivom već postoji.';

export const listOrganizations = async (): Promise<OrganizationDto[]> => {
  const records = await prisma.organization.findMany({
    include: organizationInclude,
    orderBy: { name: 'asc' },
  });

  return records.map(toOrganizationDto);
};

export const getOrganization = async (id: string): Promise<OrganizationDto> => {
  const record = await prisma.organization.findUnique({
    where: { id },
    include: organizationInclude,
  });

  if (!record) {
    throw notFound('Firma nije pronađena.');
  }

  return toOrganizationDto(record);
};

export const createOrganization = async (
  input: OrganizationWriteRequest,
): Promise<OrganizationDto> => {
  try {
    const record = await prisma.organization.create({
      data: { name: input.name, isActive: input.isActive },
      include: organizationInclude,
    });
    logger.info('Organization created', { organizationId: record.id, name: record.name });

    return toOrganizationDto(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(NAME_TAKEN_MESSAGE);
    }

    throw error;
  }
};

export const updateOrganization = async (
  id: string,
  input: OrganizationWriteRequest,
): Promise<OrganizationDto> => {
  await getOrganization(id);

  try {
    const record = await prisma.organization.update({
      where: { id },
      data: { name: input.name, isActive: input.isActive },
      include: organizationInclude,
    });
    logger.info('Organization updated', { organizationId: id, isActive: record.isActive });

    return toOrganizationDto(record);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(NAME_TAKEN_MESSAGE);
    }

    throw error;
  }
};

/**
 * An organization is only deleted while it is empty. Anything it owns would
 * otherwise be orphaned or lost, so a used organization is deactivated instead.
 */
export const deleteOrganization = async (id: string): Promise<DeleteOrganizationResult> => {
  const record = await prismaUnscoped.organization.findUnique({
    where: { id },
    select: {
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

  return { id, deleted: true };
};
