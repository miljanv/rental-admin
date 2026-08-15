import { computeCalibrationExpiry } from '@rental-admin/shared';
import type {
  DeleteTachographCalibrationResult,
  ExpiringCalibrationsQuery,
  ExpiringTachographCalibrationDto,
  TachographCalibrationDto,
  TachographCalibrationWriteRequest,
  TachographType,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import {
  toExpiringTachographCalibrationDto,
  toTachographCalibrationDto,
  type TachographCalibrationRecord,
} from '../utils/tachograph-calibration-mapper';
import { assertUploadedFile, deleteAttachedFile } from './file-attachment.service';
import {
  deleteOperationalTransaction,
  upsertOperationalExpense,
} from './transaction.service';

const calibrationInclude = { file: true } as const;

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const startOfTodayUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const addUtcDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

/** Loads the vehicle's tachograph type, which drives the calibration interval. */
const getVehicleTachographType = async (vehicleId: string): Promise<TachographType> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { tachographType: true },
  });

  if (!vehicle) {
    throw notFound('Vozilo nije pronađeno.');
  }

  return vehicle.tachographType;
};

const toWriteData = (tachographType: TachographType, input: TachographCalibrationWriteRequest) => ({
  calibratedAt: parseDate(input.calibratedAt),
  expiresAt: parseDate(computeCalibrationExpiry(tachographType, input.calibratedAt)),
  cost: input.cost,
  paymentMethod: input.paymentMethod,
  fileId: input.fileId,
});

export const listTachographCalibrations = async (
  vehicleId: string,
): Promise<TachographCalibrationDto[]> => {
  await getVehicleTachographType(vehicleId);

  const records = await prisma.tachographCalibration.findMany({
    where: { vehicleId },
    include: calibrationInclude,
    orderBy: { calibratedAt: 'desc' },
  });

  return records.map((record: TachographCalibrationRecord) => toTachographCalibrationDto(record));
};

export const getTachographCalibration = async (
  vehicleId: string,
  calibrationId: string,
): Promise<TachographCalibrationDto> => {
  const record = await prisma.tachographCalibration.findFirst({
    where: { id: calibrationId, vehicleId },
    include: calibrationInclude,
  });

  if (!record) {
    throw notFound('Kalibracija nije pronađena.');
  }

  return toTachographCalibrationDto(record);
};

export const createTachographCalibration = async (
  vehicleId: string,
  input: TachographCalibrationWriteRequest,
): Promise<TachographCalibrationDto> => {
  const tachographType = await getVehicleTachographType(vehicleId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.tachographCalibration.create({
    data: { vehicleId, ...toWriteData(tachographType, input) },
    include: calibrationInclude,
  });

  logger.info('Tachograph calibration created', { vehicleId, calibrationId: record.id });

  await upsertOperationalExpense({
    sourceType: 'CALIBRATION',
    sourceId: record.id,
    category: 'TACHOGRAPH',
    amount: input.cost,
    paymentMethod: input.paymentMethod,
    occurredAt: input.calibratedAt,
    vehicleId,
    note: 'Kalibracija tahografa',
  });

  return toTachographCalibrationDto(record);
};

export const updateTachographCalibration = async (
  vehicleId: string,
  calibrationId: string,
  input: TachographCalibrationWriteRequest,
): Promise<TachographCalibrationDto> => {
  const existing = await prisma.tachographCalibration.findFirst({
    where: { id: calibrationId, vehicleId },
  });

  if (!existing) {
    throw notFound('Kalibracija nije pronađena.');
  }

  await assertUploadedFile(input.fileId);

  const tachographType = await getVehicleTachographType(vehicleId);

  const record = await prisma.tachographCalibration.update({
    where: { id: calibrationId },
    data: toWriteData(tachographType, input),
    include: calibrationInclude,
  });

  if (existing.fileId && existing.fileId !== input.fileId) {
    await deleteAttachedFile(existing.fileId);
  }

  logger.info('Tachograph calibration updated', { vehicleId, calibrationId });

  await upsertOperationalExpense({
    sourceType: 'CALIBRATION',
    sourceId: record.id,
    category: 'TACHOGRAPH',
    amount: input.cost,
    paymentMethod: input.paymentMethod,
    occurredAt: input.calibratedAt,
    vehicleId,
    note: 'Kalibracija tahografa',
  });

  return toTachographCalibrationDto(record);
};

export const deleteTachographCalibration = async (
  vehicleId: string,
  calibrationId: string,
): Promise<DeleteTachographCalibrationResult> => {
  const existing = await prisma.tachographCalibration.findFirst({
    where: { id: calibrationId, vehicleId },
  });

  if (!existing) {
    throw notFound('Kalibracija nije pronađena.');
  }

  await deleteOperationalTransaction('CALIBRATION', calibrationId);
  await prisma.tachographCalibration.delete({ where: { id: calibrationId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Tachograph calibration deleted', { vehicleId, calibrationId });

  return { id: calibrationId, deleted: true };
};

export const listExpiringCalibrations = async (
  query: ExpiringCalibrationsQuery,
): Promise<ExpiringTachographCalibrationDto[]> => {
  const until = addUtcDays(startOfTodayUtc(), query.days);

  const records = await prisma.tachographCalibration.findMany({
    where: { expiresAt: { lte: until } },
    include: {
      ...calibrationInclude,
      vehicle: {
        select: { id: true, make: true, model: true, licensePlate: true, tachographType: true },
      },
    },
    orderBy: { expiresAt: 'asc' },
  });

  return records.map((record) => toExpiringTachographCalibrationDto(record));
};

/** Removes scans before the vehicle row (and cascaded calibrations) go away. */
export const deleteFilesForVehicle = async (vehicleId: string): Promise<void> => {
  const records = await prisma.tachographCalibration.findMany({
    where: { vehicleId },
    select: { fileId: true },
  });

  for (const record of records) {
    await deleteAttachedFile(record.fileId);
  }
};
