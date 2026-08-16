import {
  closestEarlierOdometer,
  computeFuelLogDerivedFields,
  mergeFuelSuppliers,
  summarizeFuelLogs,
} from '@rental-admin/shared';
import type {
  DeleteFuelLogResult,
  FuelConsumptionHistoryDto,
  FuelConsumptionQuery,
  FuelLogBulkWriteRequest,
  FuelLogCreateRequest,
  FuelLogDto,
  FuelLogSuppliersDto,
  FuelLogWriteRequest,
  ListFuelLogsQuery,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { badRequest, notFound } from '../utils/app-error';
import { toFuelLogDto, type FuelLogRecord } from '../utils/fuel-log-mapper';
import { logger } from '../utils/logger';
import {
  deleteOperationalTransaction,
  upsertOperationalExpense,
} from './transaction.service';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const fuelLogInclude = {
  driver: { select: { id: true, firstName: true, lastName: true } },
  vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
} as const;

const expenseNote = (input: { note: string | null; location: string; supplier: string }): string => {
  if (input.note) {
    return input.note;
  }

  if (input.location) {
    return `Točenje · ${input.location}`;
  }

  return `Točenje · ${input.supplier}`;
};

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

const toCreateInput = (vehicleId: string, input: FuelLogWriteRequest): FuelLogCreateRequest => ({
  ...input,
  vehicleId,
});

export const listFuelLogs = async (query: ListFuelLogsQuery): Promise<FuelLogDto[]> => {
  if (query.vehicleId) {
    await assertVehicleExists(query.vehicleId);
  }

  const records = await prisma.fuelLog.findMany({
    where: {
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.supplier
        ? { supplier: { contains: query.supplier, mode: 'insensitive' as const } }
        : {}),
      ...(query.fuelType ? { fuelType: query.fuelType } : {}),
      ...(query.driverId ? { driverId: query.driverId } : {}),
      ...(query.from || query.to
        ? {
            fueledAt: {
              ...(query.from ? { gte: parseDate(query.from) } : {}),
              ...(query.to ? { lte: parseDate(query.to) } : {}),
            },
          }
        : {}),
    },
    include: fuelLogInclude,
    orderBy: [{ fueledAt: query.sortOrder }, { odometerKm: query.sortOrder }],
  });

  return records.map((record: FuelLogRecord) => toFuelLogDto(record));
};

export const getFuelLog = async (fuelLogId: string, vehicleId?: string): Promise<FuelLogDto> => {
  const record = await prisma.fuelLog.findFirst({
    where: { id: fuelLogId, ...(vehicleId ? { vehicleId } : {}) },
    include: fuelLogInclude,
  });

  if (!record) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  return toFuelLogDto(record);
};

export const createFuelLog = async (
  input: FuelLogCreateRequest,
  previousOdometerOverride?: number | null,
): Promise<FuelLogDto> => {
  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const previousFromDb = await findPreviousOdometerKm(input.vehicleId, input.odometerKm);
  const previousOdometerKm =
    previousOdometerOverride !== undefined
      ? closestEarlierOdometer(input.odometerKm, [previousFromDb, previousOdometerOverride])
      : previousFromDb;
  const { kmDriven, consumptionPer100Km } = computeFuelLogDerivedFields(
    input.odometerKm,
    previousOdometerKm,
    input.litersFilled,
  );

  const record = await prisma.fuelLog.create({
    data: {
      vehicleId: input.vehicleId,
      fueledAt: parseDate(input.fueledAt),
      location: input.location,
      driverId: input.driverId,
      fuelType: input.fuelType,
      litersFilled: input.litersFilled,
      odometerKm: input.odometerKm,
      cost: input.cost,
      paymentMethod: input.paymentMethod,
      supplier: input.supplier,
      note: input.note,
      kmDriven,
      consumptionPer100Km,
    },
    include: fuelLogInclude,
  });

  await bumpVehicleMileage(input.vehicleId, input.odometerKm);
  await upsertOperationalExpense({
    sourceType: 'FUEL_LOG',
    sourceId: record.id,
    category: 'FUEL',
    amount: input.cost,
    paymentMethod: input.paymentMethod,
    occurredAt: input.fueledAt,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    supplier: input.supplier,
    note: expenseNote(input),
  });

  logger.info('Fuel log created', {
    vehicleId: input.vehicleId,
    fuelLogId: record.id,
    fuelType: record.fuelType,
  });

  return toFuelLogDto(record);
};

export const createFuelLogsBulk = async (
  input: FuelLogBulkWriteRequest,
): Promise<FuelLogDto[]> => {
  const vehicleIds = [...new Set(input.rows.map((row) => row.vehicleId))];
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds } },
    select: { id: true },
  });

  if (vehicles.length !== vehicleIds.length) {
    throw badRequest('Jedno ili više vozila ne postoji.');
  }

  const created: FuelLogDto[] = [];
  const lastOdometerByVehicle = new Map<string, number>();
  const sortedRows = [...input.rows].sort((left, right) => {
    if (left.vehicleId !== right.vehicleId) {
      return left.vehicleId.localeCompare(right.vehicleId);
    }

    return left.odometerKm - right.odometerKm;
  });

  for (const row of sortedRows) {
    const dto = await createFuelLog(
      {
        vehicleId: row.vehicleId,
        fueledAt: input.fueledAt,
        location: input.location,
        supplier: input.supplier,
        driverId: row.driverId,
        fuelType: row.fuelType ?? input.fuelType,
        litersFilled: row.litersFilled,
        odometerKm: row.odometerKm,
        cost: row.cost,
        paymentMethod: row.paymentMethod,
        note: row.note,
      },
      lastOdometerByVehicle.get(row.vehicleId) ?? null,
    );

    lastOdometerByVehicle.set(row.vehicleId, row.odometerKm);
    created.push(dto);
  }

  return created;
};

export const updateFuelLog = async (
  fuelLogId: string,
  input: FuelLogCreateRequest,
): Promise<FuelLogDto> => {
  const existing = await prisma.fuelLog.findFirst({ where: { id: fuelLogId } });

  if (!existing) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  await assertVehicleExists(input.vehicleId);
  await assertDriverExists(input.driverId);

  const previousOdometerKm = await findPreviousOdometerKm(
    input.vehicleId,
    input.odometerKm,
    fuelLogId,
  );
  const { kmDriven, consumptionPer100Km } = computeFuelLogDerivedFields(
    input.odometerKm,
    previousOdometerKm,
    input.litersFilled,
  );

  const record = await prisma.fuelLog.update({
    where: { id: fuelLogId },
    data: {
      vehicleId: input.vehicleId,
      fueledAt: parseDate(input.fueledAt),
      location: input.location,
      driverId: input.driverId,
      fuelType: input.fuelType,
      litersFilled: input.litersFilled,
      odometerKm: input.odometerKm,
      cost: input.cost,
      paymentMethod: input.paymentMethod,
      supplier: input.supplier,
      note: input.note,
      kmDriven,
      consumptionPer100Km,
    },
    include: fuelLogInclude,
  });

  await bumpVehicleMileage(input.vehicleId, input.odometerKm);
  await upsertOperationalExpense({
    sourceType: 'FUEL_LOG',
    sourceId: record.id,
    category: 'FUEL',
    amount: input.cost,
    paymentMethod: input.paymentMethod,
    occurredAt: input.fueledAt,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    supplier: input.supplier,
    note: expenseNote(input),
  });

  logger.info('Fuel log updated', { vehicleId: input.vehicleId, fuelLogId });

  return toFuelLogDto(record);
};

export const deleteFuelLog = async (fuelLogId: string): Promise<DeleteFuelLogResult> => {
  const existing = await prisma.fuelLog.findFirst({ where: { id: fuelLogId } });

  if (!existing) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  await deleteOperationalTransaction('FUEL_LOG', fuelLogId);
  await prisma.fuelLog.delete({ where: { id: fuelLogId } });
  logger.info('Fuel log deleted', { vehicleId: existing.vehicleId, fuelLogId });

  return { id: fuelLogId, deleted: true };
};

export const listFuelSuppliers = async (): Promise<FuelLogSuppliersDto> => {
  const rows = await prisma.fuelLog.findMany({
    where: { supplier: { not: '' } },
    distinct: ['supplier'],
    select: { supplier: true },
    orderBy: { supplier: 'asc' },
  });

  return { suppliers: mergeFuelSuppliers(rows.map((row) => row.supplier)) };
};

export const getFuelConsumption = async (
  query: FuelConsumptionQuery,
): Promise<FuelConsumptionHistoryDto> => {
  const items = await listFuelLogs({
    vehicleId: query.vehicleId,
    from: query.from,
    to: query.to,
    sortOrder: 'asc',
  });

  return {
    vehicleId: query.vehicleId,
    from: query.from ?? null,
    to: query.to ?? null,
    items,
    diesel: summarizeFuelLogs(items.filter((item) => item.fuelType === 'DIESEL')),
    adblue: summarizeFuelLogs(items.filter((item) => item.fuelType === 'ADBLUE')),
  };
};

export const createVehicleFuelLog = async (
  vehicleId: string,
  input: FuelLogWriteRequest,
): Promise<FuelLogDto> => createFuelLog(toCreateInput(vehicleId, input));

export const updateVehicleFuelLog = async (
  vehicleId: string,
  fuelLogId: string,
  input: FuelLogWriteRequest,
): Promise<FuelLogDto> => {
  const existing = await prisma.fuelLog.findFirst({ where: { id: fuelLogId, vehicleId } });

  if (!existing) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  return updateFuelLog(fuelLogId, toCreateInput(vehicleId, input));
};

export const deleteVehicleFuelLog = async (
  vehicleId: string,
  fuelLogId: string,
): Promise<DeleteFuelLogResult> => {
  const existing = await prisma.fuelLog.findFirst({ where: { id: fuelLogId, vehicleId } });

  if (!existing) {
    throw notFound('Zapis o točenju nije pronađen.');
  }

  return deleteFuelLog(fuelLogId);
};
