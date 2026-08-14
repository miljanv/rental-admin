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
});

export const listVehicleSafetyEquipment = async (
  vehicleId: string,
): Promise<VehicleSafetyEquipmentDto[]> => {
  await assertVehicleExists(vehicleId);

  const records = await prisma.vehicleSafetyEquipment.findMany({
    where: { vehicleId },
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

  const record = await prisma.vehicleSafetyEquipment.create({
    data: { vehicleId, ...toWriteData(input) },
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

  const record = await prisma.vehicleSafetyEquipment.update({
    where: { id: equipmentId },
    data: toWriteData(input),
  });

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
      vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
    },
    orderBy: { expiresAt: 'asc' },
  });

  return records.map((record) => toExpiringVehicleSafetyEquipmentDto(record));
};
