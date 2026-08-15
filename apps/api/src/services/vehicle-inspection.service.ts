import { computeInspectionExpiry } from '@rental-admin/shared';
import type {
  DeleteVehicleInspectionResult,
  ExpiringInspectionsQuery,
  ExpiringVehicleInspectionDto,
  VehicleInspectionDto,
  VehicleInspectionWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import {
  toExpiringVehicleInspectionDto,
  toVehicleInspectionDto,
  type VehicleInspectionRecord,
} from '../utils/vehicle-inspection-mapper';
import { assertUploadedFile, deleteAttachedFile } from './file-attachment.service';
import {
  deleteOperationalTransaction,
  upsertOperationalExpense,
} from './transaction.service';

const inspectionInclude = { file: true } as const;

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

const assertVehicleExists = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw notFound('Vozilo nije pronađeno.');
  }
};

/** `expiresAt` is always derived server-side; a client-supplied value is never trusted. */
const toWriteData = (input: VehicleInspectionWriteRequest) => ({
  type: input.type,
  inspectedAt: parseDate(input.inspectedAt),
  expiresAt: parseDate(computeInspectionExpiry(input.type, input.inspectedAt)),
  cost: input.cost,
  paymentMethod: input.paymentMethod,
  fileId: input.fileId,
});

export const listVehicleInspections = async (
  vehicleId: string,
): Promise<VehicleInspectionDto[]> => {
  await assertVehicleExists(vehicleId);

  const records = await prisma.vehicleInspection.findMany({
    where: { vehicleId },
    include: inspectionInclude,
    orderBy: { inspectedAt: 'desc' },
  });

  return records.map((record: VehicleInspectionRecord) => toVehicleInspectionDto(record));
};

export const getVehicleInspection = async (
  vehicleId: string,
  inspectionId: string,
): Promise<VehicleInspectionDto> => {
  const record = await prisma.vehicleInspection.findFirst({
    where: { id: inspectionId, vehicleId },
    include: inspectionInclude,
  });

  if (!record) {
    throw notFound('Pregled nije pronađen.');
  }

  return toVehicleInspectionDto(record);
};

export const createVehicleInspection = async (
  vehicleId: string,
  input: VehicleInspectionWriteRequest,
): Promise<VehicleInspectionDto> => {
  await assertVehicleExists(vehicleId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.vehicleInspection.create({
    data: { vehicleId, ...toWriteData(input) },
    include: inspectionInclude,
  });

  logger.info('Vehicle inspection created', {
    vehicleId,
    inspectionId: record.id,
    type: record.type,
  });

  await upsertOperationalExpense({
    sourceType: 'INSPECTION',
    sourceId: record.id,
    category: 'TECHNICAL_INSPECTION',
    amount: input.cost,
    paymentMethod: input.paymentMethod,
    occurredAt: input.inspectedAt,
    vehicleId,
    note: 'Tehnički pregled',
  });

  return toVehicleInspectionDto(record);
};

export const updateVehicleInspection = async (
  vehicleId: string,
  inspectionId: string,
  input: VehicleInspectionWriteRequest,
): Promise<VehicleInspectionDto> => {
  const existing = await prisma.vehicleInspection.findFirst({
    where: { id: inspectionId, vehicleId },
  });

  if (!existing) {
    throw notFound('Pregled nije pronađen.');
  }

  await assertUploadedFile(input.fileId);

  const record = await prisma.vehicleInspection.update({
    where: { id: inspectionId },
    data: toWriteData(input),
    include: inspectionInclude,
  });

  if (existing.fileId && existing.fileId !== input.fileId) {
    await deleteAttachedFile(existing.fileId);
  }

  logger.info('Vehicle inspection updated', { vehicleId, inspectionId });

  await upsertOperationalExpense({
    sourceType: 'INSPECTION',
    sourceId: record.id,
    category: 'TECHNICAL_INSPECTION',
    amount: input.cost,
    paymentMethod: input.paymentMethod,
    occurredAt: input.inspectedAt,
    vehicleId,
    note: 'Tehnički pregled',
  });

  return toVehicleInspectionDto(record);
};

export const deleteVehicleInspection = async (
  vehicleId: string,
  inspectionId: string,
): Promise<DeleteVehicleInspectionResult> => {
  const existing = await prisma.vehicleInspection.findFirst({
    where: { id: inspectionId, vehicleId },
  });

  if (!existing) {
    throw notFound('Pregled nije pronađen.');
  }

  await deleteOperationalTransaction('INSPECTION', inspectionId);
  await prisma.vehicleInspection.delete({ where: { id: inspectionId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Vehicle inspection deleted', { vehicleId, inspectionId });

  return { id: inspectionId, deleted: true };
};

export const listExpiringInspections = async (
  query: ExpiringInspectionsQuery,
): Promise<ExpiringVehicleInspectionDto[]> => {
  const until = addUtcDays(startOfTodayUtc(), query.days);

  const records = await prisma.vehicleInspection.findMany({
    where: { expiresAt: { lte: until } },
    include: {
      ...inspectionInclude,
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { expiresAt: 'asc' },
  });

  return records.map((record) => toExpiringVehicleInspectionDto(record));
};

/** Removes scans before the vehicle row (and cascaded inspections) go away. */
export const deleteFilesForVehicle = async (vehicleId: string): Promise<void> => {
  const records = await prisma.vehicleInspection.findMany({
    where: { vehicleId },
    select: { fileId: true },
  });

  for (const record of records) {
    await deleteAttachedFile(record.fileId);
  }
};
