import type {
  DeleteVehicleMaintenanceResult,
  ListVehicleMaintenanceQuery,
  MaintenanceCostSummaryDto,
  MaintenanceCostSummaryQuery,
  VehicleMaintenanceDto,
  VehicleMaintenanceWriteRequest,
} from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import {
  toVehicleMaintenanceDto,
  type VehicleMaintenanceRecord,
} from '../utils/vehicle-maintenance-mapper';

const parseDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

const assertVehicleExists = async (vehicleId: string): Promise<void> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });

  if (!vehicle) {
    throw notFound('Vozilo nije pronađeno.');
  }
};

const toWriteData = (input: VehicleMaintenanceWriteRequest) => ({
  date: parseDate(input.date),
  odometerKm: input.odometerKm,
  partName: input.partName,
  supplier: input.supplier,
  cost: input.cost,
  mechanic: input.mechanic,
});

export const listVehicleMaintenance = async (
  vehicleId: string,
  query: ListVehicleMaintenanceQuery,
): Promise<VehicleMaintenanceDto[]> => {
  await assertVehicleExists(vehicleId);

  const where = {
    vehicleId,
    ...(query.supplier ? { supplier: { contains: query.supplier, mode: 'insensitive' as const } } : {}),
    ...(query.from || query.to
      ? {
          date: {
            ...(query.from ? { gte: parseDate(query.from) } : {}),
            ...(query.to ? { lte: parseDate(query.to) } : {}),
          },
        }
      : {}),
  };

  const records = await prisma.vehicleMaintenance.findMany({
    where,
    orderBy: { date: query.sortOrder },
  });

  return records.map((record: VehicleMaintenanceRecord) => toVehicleMaintenanceDto(record));
};

export const getVehicleMaintenance = async (
  vehicleId: string,
  maintenanceId: string,
): Promise<VehicleMaintenanceDto> => {
  const record = await prisma.vehicleMaintenance.findFirst({
    where: { id: maintenanceId, vehicleId },
  });

  if (!record) {
    throw notFound('Zapis o održavanju nije pronađen.');
  }

  return toVehicleMaintenanceDto(record);
};

export const createVehicleMaintenance = async (
  vehicleId: string,
  input: VehicleMaintenanceWriteRequest,
): Promise<VehicleMaintenanceDto> => {
  await assertVehicleExists(vehicleId);

  const record = await prisma.vehicleMaintenance.create({
    data: { vehicleId, ...toWriteData(input) },
  });

  logger.info('Vehicle maintenance created', { vehicleId, maintenanceId: record.id });

  return toVehicleMaintenanceDto(record);
};

export const updateVehicleMaintenance = async (
  vehicleId: string,
  maintenanceId: string,
  input: VehicleMaintenanceWriteRequest,
): Promise<VehicleMaintenanceDto> => {
  const existing = await prisma.vehicleMaintenance.findFirst({
    where: { id: maintenanceId, vehicleId },
  });

  if (!existing) {
    throw notFound('Zapis o održavanju nije pronađen.');
  }

  const record = await prisma.vehicleMaintenance.update({
    where: { id: maintenanceId },
    data: toWriteData(input),
  });

  logger.info('Vehicle maintenance updated', { vehicleId, maintenanceId });

  return toVehicleMaintenanceDto(record);
};

export const deleteVehicleMaintenance = async (
  vehicleId: string,
  maintenanceId: string,
): Promise<DeleteVehicleMaintenanceResult> => {
  const existing = await prisma.vehicleMaintenance.findFirst({
    where: { id: maintenanceId, vehicleId },
  });

  if (!existing) {
    throw notFound('Zapis o održavanju nije pronađen.');
  }

  await prisma.vehicleMaintenance.delete({ where: { id: maintenanceId } });
  logger.info('Vehicle maintenance deleted', { vehicleId, maintenanceId });

  return { id: maintenanceId, deleted: true };
};

/**
 * Not vehicle-scoped by path — filters are all optional so this one endpoint
 * answers per-vehicle, per-period, and per-supplier totals alike (and is
 * reusable fleet-wide by a future Finansije view).
 */
export const getMaintenanceCostSummary = async (
  query: MaintenanceCostSummaryQuery,
): Promise<MaintenanceCostSummaryDto> => {
  const where = {
    ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
    ...(query.supplier ? { supplier: { contains: query.supplier, mode: 'insensitive' as const } } : {}),
    ...(query.from || query.to
      ? {
          date: {
            ...(query.from ? { gte: parseDate(query.from) } : {}),
            ...(query.to ? { lte: parseDate(query.to) } : {}),
          },
        }
      : {}),
  };

  const [overall, bySupplier] = await Promise.all([
    prisma.vehicleMaintenance.aggregate({ where, _sum: { cost: true }, _count: true }),
    prisma.vehicleMaintenance.groupBy({
      by: ['supplier'],
      where,
      _sum: { cost: true },
      _count: true,
      orderBy: { _sum: { cost: 'desc' } },
    }),
  ]);

  return {
    total: overall._sum.cost ?? 0,
    count: overall._count,
    bySupplier: bySupplier.map((row) => ({
      supplier: row.supplier,
      total: row._sum.cost ?? 0,
      count: row._count,
    })),
  };
};
