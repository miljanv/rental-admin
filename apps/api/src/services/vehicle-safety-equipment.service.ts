import { computeSafetyEquipmentExpiry } from '@rental-admin/shared';
import type {
  DeleteVehicleSafetyEquipmentResult,
  ExpiringSafetyEquipmentQuery,
  ExpiringVehicleSafetyEquipmentDto,
  VehicleSafetyEquipmentDto,
  VehicleSafetyEquipmentWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import {
  toExpiringVehicleSafetyEquipmentDto,
  toVehicleSafetyEquipmentDto,
  type VehicleSafetyEquipmentRecord,
} from '../utils/vehicle-safety-equipment-mapper';
import { assertUploadedFile, deleteAttachedFile } from './file-attachment.service';

const equipmentInclude = { file: true } as const;

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

/** `expiresAt` is always derived server-side; a client-supplied value is never trusted as-is. */
const toWriteData = (input: VehicleSafetyEquipmentWriteRequest) => ({
  type: input.type,
  checkedAt: parseDate(input.checkedAt),
  expiresAt: parseDate(
    computeSafetyEquipmentExpiry(input.type, input.checkedAt, input.expiresAt),
  ),
  fileId: input.fileId,
});

export const listVehicleSafetyEquipment = async (
  vehicleId: string,
): Promise<VehicleSafetyEquipmentDto[]> => {
  await assertVehicleExists(vehicleId);

  const records = await prisma.vehicleSafetyEquipment.findMany({
    where: { vehicleId },
    include: equipmentInclude,
    orderBy: { checkedAt: 'desc' },
  });

  return records.map((record: VehicleSafetyEquipmentRecord) => toVehicleSafetyEquipmentDto(record));
};

export const getVehicleSafetyEquipment = async (
  vehicleId: string,
  equipmentId: string,
): Promise<VehicleSafetyEquipmentDto> => {
  const record = await prisma.vehicleSafetyEquipment.findFirst({
    where: { id: equipmentId, vehicleId },
    include: equipmentInclude,
  });

  if (!record) {
    throw notFound('Oprema nije pronađena.');
  }

  return toVehicleSafetyEquipmentDto(record);
};

export const createVehicleSafetyEquipment = async (
  vehicleId: string,
  input: VehicleSafetyEquipmentWriteRequest,
): Promise<VehicleSafetyEquipmentDto> => {
  await assertVehicleExists(vehicleId);
  await assertUploadedFile(input.fileId);

  const record = await prisma.vehicleSafetyEquipment.create({
    data: { vehicleId, ...toWriteData(input) },
    include: equipmentInclude,
  });

  logger.info('Vehicle safety equipment created', {
    vehicleId,
    equipmentId: record.id,
    type: record.type,
  });

  return toVehicleSafetyEquipmentDto(record);
};

export const updateVehicleSafetyEquipment = async (
  vehicleId: string,
  equipmentId: string,
  input: VehicleSafetyEquipmentWriteRequest,
): Promise<VehicleSafetyEquipmentDto> => {
  const existing = await prisma.vehicleSafetyEquipment.findFirst({
    where: { id: equipmentId, vehicleId },
  });

  if (!existing) {
    throw notFound('Oprema nije pronađena.');
  }

  await assertUploadedFile(input.fileId);

  const record = await prisma.vehicleSafetyEquipment.update({
    where: { id: equipmentId },
    data: toWriteData(input),
    include: equipmentInclude,
  });

  if (existing.fileId && existing.fileId !== input.fileId) {
    await deleteAttachedFile(existing.fileId);
  }

  logger.info('Vehicle safety equipment updated', { vehicleId, equipmentId });

  return toVehicleSafetyEquipmentDto(record);
};

export const deleteVehicleSafetyEquipment = async (
  vehicleId: string,
  equipmentId: string,
): Promise<DeleteVehicleSafetyEquipmentResult> => {
  const existing = await prisma.vehicleSafetyEquipment.findFirst({
    where: { id: equipmentId, vehicleId },
  });

  if (!existing) {
    throw notFound('Oprema nije pronađena.');
  }

  await prisma.vehicleSafetyEquipment.delete({ where: { id: equipmentId } });
  await deleteAttachedFile(existing.fileId);
  logger.info('Vehicle safety equipment deleted', { vehicleId, equipmentId });

  return { id: equipmentId, deleted: true };
};

export const listExpiringSafetyEquipment = async (
  query: ExpiringSafetyEquipmentQuery,
): Promise<ExpiringVehicleSafetyEquipmentDto[]> => {
  const until = addUtcDays(startOfTodayUtc(), query.days);

  const records = await prisma.vehicleSafetyEquipment.findMany({
    where: { expiresAt: { lte: until } },
    include: {
      ...equipmentInclude,
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { expiresAt: 'asc' },
  });

  return records.map((record) => toExpiringVehicleSafetyEquipmentDto(record));
};

/** Removes scans before the vehicle row (and cascaded safety equipment) go away. */
export const deleteFilesForVehicle = async (vehicleId: string): Promise<void> => {
  const records = await prisma.vehicleSafetyEquipment.findMany({
    where: { vehicleId },
    select: { fileId: true },
  });

  for (const record of records) {
    await deleteAttachedFile(record.fileId);
  }
};
