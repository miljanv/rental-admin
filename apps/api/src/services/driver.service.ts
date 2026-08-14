import type {
  DeleteDriverResult,
  DriverDto,
  DriverSortField,
  DriverWriteRequest,
  ListDriversQuery,
  PaginationMeta,
  SortOrder,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { toDriverDto, type DriverRecord } from '../utils/driver-mapper';
import { logger } from '../utils/logger';

type DriverOrderBy = Partial<Record<DriverSortField, SortOrder>>;

const parseDateOfBirth = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const toWriteData = (input: DriverWriteRequest) => ({
  firstName: input.firstName,
  lastName: input.lastName,
  jmbg: input.jmbg,
  dateOfBirth: parseDateOfBirth(input.dateOfBirth),
  residencePlace: input.residencePlace,
  educationLevel: input.educationLevel,
  idCardNumber: input.idCardNumber,
  drivingLicenseNumber: input.drivingLicenseNumber,
  drivingLicenseCategory: input.drivingLicenseCategory,
  licenseNumber: input.licenseNumber,
  phone: input.phone,
  email: input.email,
  jobTitle: input.jobTitle,
  status: input.status,
});

const isJmbgConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (error as { code: unknown }).code === 'P2002';
};

export const listDrivers = async (
  query: ListDriversQuery,
): Promise<{ drivers: DriverDto[]; pagination: PaginationMeta }> => {
  const orderBy: DriverOrderBy = { [query.sortBy]: query.sortOrder };

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' as const } },
            { lastName: { contains: query.search, mode: 'insensitive' as const } },
            { jmbg: { contains: query.search } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    drivers: records.map((record: DriverRecord) => toDriverDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getDriver = async (id: string): Promise<DriverDto> => {
  const record = await prisma.driver.findUnique({ where: { id } });

  if (!record) {
    throw notFound('Vozač nije pronađen.');
  }

  return toDriverDto(record);
};

export const createDriver = async (input: DriverWriteRequest): Promise<DriverDto> => {
  try {
    const record = await prisma.driver.create({ data: toWriteData(input) });
    logger.info('Driver created', { driverId: record.id, jmbg: record.jmbg });
    return toDriverDto(record);
  } catch (error) {
    if (isJmbgConflict(error)) {
      throw conflict('Vozač sa ovim JMBG-om već postoji.');
    }

    throw error;
  }
};

export const updateDriver = async (id: string, input: DriverWriteRequest): Promise<DriverDto> => {
  await getDriver(id);

  try {
    const record = await prisma.driver.update({ where: { id }, data: toWriteData(input) });
    logger.info('Driver updated', { driverId: record.id });
    return toDriverDto(record);
  } catch (error) {
    if (isJmbgConflict(error)) {
      throw conflict('Vozač sa ovim JMBG-om već postoji.');
    }

    throw error;
  }
};

export const deleteDriver = async (id: string): Promise<DeleteDriverResult> => {
  await getDriver(id);
  await prisma.driver.delete({ where: { id } });
  logger.info('Driver deleted', { driverId: id });

  return { id, deleted: true };
};
