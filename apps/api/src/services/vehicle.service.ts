import type {
  DeleteVehicleResult,
  ListVehiclesQuery,
  PaginationMeta,
  SortOrder,
  VehicleDto,
  VehicleSortField,
  VehicleWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { conflict, notFound } from '../utils/app-error';
import { buildPaginationMeta } from '../utils/api-response';
import { logger } from '../utils/logger';
import { toVehicleDto, type VehicleRecord } from '../utils/vehicle-mapper';
import { deleteFilesForVehicle as deleteCalibrationFiles } from './tachograph-calibration.service';
import { deleteFilesForVehicle as deleteDocumentFiles } from './vehicle-document.service';
import { deleteFilesForVehicle as deleteInspectionFiles } from './vehicle-inspection.service';
import { deleteFilesForVehicle as deleteSafetyEquipmentFiles } from './vehicle-safety-equipment.service';

type VehicleOrderBy = Partial<Record<VehicleSortField, SortOrder>>;

const toWriteData = (input: VehicleWriteRequest) => ({
  make: input.make,
  model: input.model,
  year: input.year,
  licensePlate: input.licensePlate,
  vin: input.vin,
  seatCount: input.seatCount,
  type: input.type,
  fuelType: input.fuelType,
  tachographType: input.tachographType,
  status: input.status,
  currentMileage: input.currentMileage,
});

const conflictField = (error: unknown): 'licensePlate' | 'vin' | null => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  if ((error as { code: unknown }).code !== 'P2002') {
    return null;
  }

  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  const fields = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];

  if (fields.some((field) => field.toLowerCase().includes('licenseplate'))) {
    return 'licensePlate';
  }

  if (fields.some((field) => field.toLowerCase().includes('vin'))) {
    return 'vin';
  }

  return null;
};

const throwOnConflict = (error: unknown): never => {
  const field = conflictField(error);

  if (field === 'licensePlate') {
    throw conflict('Vozilo sa ovim registarskim tablicama već postoji.');
  }

  if (field === 'vin') {
    throw conflict('Vozilo sa ovim VIN brojem već postoji.');
  }

  throw error;
};

export const listVehicles = async (
  query: ListVehiclesQuery,
): Promise<{ vehicles: VehicleDto[]; pagination: PaginationMeta }> => {
  const orderBy: VehicleOrderBy = { [query.sortBy]: query.sortOrder };

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.search
      ? {
          OR: [
            { make: { contains: query.search, mode: 'insensitive' as const } },
            { model: { contains: query.search, mode: 'insensitive' as const } },
            { licensePlate: { contains: query.search, mode: 'insensitive' as const } },
            { vin: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    vehicles: records.map((record: VehicleRecord) => toVehicleDto(record)),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getVehicle = async (id: string): Promise<VehicleDto> => {
  const record = await prisma.vehicle.findUnique({ where: { id } });

  if (!record) {
    throw notFound('Vozilo nije pronađeno.');
  }

  return toVehicleDto(record);
};

export const createVehicle = async (input: VehicleWriteRequest): Promise<VehicleDto> => {
  try {
    const record = await prisma.vehicle.create({ data: toWriteData(input) });
    logger.info('Vehicle created', { vehicleId: record.id, licensePlate: record.licensePlate });
    return toVehicleDto(record);
  } catch (error) {
    return throwOnConflict(error);
  }
};

export const updateVehicle = async (
  id: string,
  input: VehicleWriteRequest,
): Promise<VehicleDto> => {
  await getVehicle(id);

  try {
    const record = await prisma.vehicle.update({ where: { id }, data: toWriteData(input) });
    logger.info('Vehicle updated', { vehicleId: record.id });
    return toVehicleDto(record);
  } catch (error) {
    return throwOnConflict(error);
  }
};

export const deleteVehicle = async (id: string): Promise<DeleteVehicleResult> => {
  await getVehicle(id);

  // Attached scans live in S3, not in Postgres — the cascade deletes the rows
  // but can't reach into the bucket, so each sub-resource's files are cleaned
  // up explicitly first.
  await deleteInspectionFiles(id);
  await deleteCalibrationFiles(id);
  await deleteSafetyEquipmentFiles(id);
  await deleteDocumentFiles(id);

  await prisma.vehicle.delete({ where: { id } });
  logger.info('Vehicle deleted', { vehicleId: id });

  return { id, deleted: true };
};
