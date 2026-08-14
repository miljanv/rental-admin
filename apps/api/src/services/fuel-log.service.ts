import { computeFuelLogDerivedFields } from '@rental-admin/shared';
import type {
  DeleteFuelLogResult,
  FuelLogDto,
  FuelLogWriteRequest,
  ListFuelLogsQuery,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { toFuelLogDto, type FuelLogRecord } from '../utils/fuel-log-mapper';
import { logger } from '../utils/logger';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const fuelLogInclude = {
  driver: { select: { id: true, firstName: true, lastName: true } },
} as const;

const assertVehicleExists = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw notFound('Vozilo nije pronađeno.');
  }
};

const assertDriverExists = async (driverId: string | null): Promise<void> => {
  if (!driverId) {
    return;
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId }, select: { id: true } });

  if (!driver) {
    throw badRequest('Izabrani vozač ne postoji.');
  }
};

/** Closest earlier odometer reading for this vehicle, across any fuel type. */
const findPreviousOdometerKm = async (
  vehicleId: string,
  odometerKm: number,
  excludeId?: string,
): Promise<number | null> => {
  const previous = await prisma.fuelLog.findFirst({
    where: {
      vehicleId,
      odometerKm: { lt: odometerKm },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: { odometerKm: 'desc' },
    select: { odometerKm: true },
  });

  return previous?.odometerKm ?? null;
};

/** Keeps the vehicle's headline mileage in sync with the highest known reading. */
const bumpVehicleMileage = async (vehicleId: string, odometerKm: number): Promise<void> => {
  await prisma.vehicle.updateMany({
    where: { id: vehicleId, currentMileage: { lt: odometerKm } },
    data: { currentMileage: odometerKm },
  });
};

export const listFuelLogs = async (
  vehicleId: string,
  query: ListFuelLogsQuery,
): Promise<FuelLogDto[]> => {
  await assertVehicleExists(vehicleId);

  const where = {
    vehicleId,
    ...(query.fuelType ? { fuelType: query.fuelType } : {}),
    ...(query.from || query.to
      ? {
          fueledAt: {
            ...(query.from ? { gte: parseDate(query.from) } : {}),
            ...(query.to ? { lte: parseDate(query.to) } : {}),
          },
        }
      : {}),
  };

  const records = await prisma.fuelLog.findMany({
    where,
    include: fuelLogInclude,
    orderBy: { fueledAt: query.sortOrder },
  });

  return records.map((record: FuelLogRecord) => toFuelLogDto(record));
};

export const getFuelLog = async (vehicleId: string, fuelLogId: string): Promise<FuelLogDto> => {
  const record = await prisma.fuelLog.findFirst({
    where: { id: fuelLogId, vehicleId },
    include: fuelLogInclude,
  });

  if (!record) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  return toFuelLogDto(record);
};

export const createFuelLog = async (
  vehicleId: string,
  input: FuelLogWriteRequest,
): Promise<FuelLogDto> => {
  await assertVehicleExists(vehicleId);
  await assertDriverExists(input.driverId);

  const previousOdometerKm = await findPreviousOdometerKm(vehicleId, input.odometerKm);
  const { kmDriven, consumptionPer100Km } = computeFuelLogDerivedFields(
    input.odometerKm,
    previousOdometerKm,
    input.litersFilled,
  );

  const record = await prisma.fuelLog.create({
    data: {
      vehicleId,
      fueledAt: parseDate(input.fueledAt),
      location: input.location,
      driverId: input.driverId,
      fuelType: input.fuelType,
      litersFilled: input.litersFilled,
      odometerKm: input.odometerKm,
      kmDriven,
      consumptionPer100Km,
    },
    include: fuelLogInclude,
  });

  await bumpVehicleMileage(vehicleId, input.odometerKm);

  logger.info('Fuel log created', { vehicleId, fuelLogId: record.id, fuelType: record.fuelType });

  return toFuelLogDto(record);
};

export const updateFuelLog = async (
  vehicleId: string,
  fuelLogId: string,
  input: FuelLogWriteRequest,
): Promise<FuelLogDto> => {
  const existing = await prisma.fuelLog.findFirst({ where: { id: fuelLogId, vehicleId } });

  if (!existing) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  await assertDriverExists(input.driverId);

  const previousOdometerKm = await findPreviousOdometerKm(vehicleId, input.odometerKm, fuelLogId);
  const { kmDriven, consumptionPer100Km } = computeFuelLogDerivedFields(
    input.odometerKm,
    previousOdometerKm,
    input.litersFilled,
  );

  const record = await prisma.fuelLog.update({
    where: { id: fuelLogId },
    data: {
      fueledAt: parseDate(input.fueledAt),
      location: input.location,
      driverId: input.driverId,
      fuelType: input.fuelType,
      litersFilled: input.litersFilled,
      odometerKm: input.odometerKm,
      kmDriven,
      consumptionPer100Km,
    },
    include: fuelLogInclude,
  });

  await bumpVehicleMileage(vehicleId, input.odometerKm);

  logger.info('Fuel log updated', { vehicleId, fuelLogId });

  return toFuelLogDto(record);
};

export const deleteFuelLog = async (
  vehicleId: string,
  fuelLogId: string,
): Promise<DeleteFuelLogResult> => {
  const existing = await prisma.fuelLog.findFirst({ where: { id: fuelLogId, vehicleId } });

  if (!existing) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  await prisma.fuelLog.delete({ where: { id: fuelLogId } });
  logger.info('Fuel log deleted', { vehicleId, fuelLogId });

  return { id: fuelLogId, deleted: true };
};
