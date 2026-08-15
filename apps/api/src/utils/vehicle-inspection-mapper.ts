import type {
  ExpiringVehicleInspectionDto,
  PaymentMethod,
  VehicleInspectionDto,
  VehicleInspectionType,
} from '@rental-admin/shared';

import { toAttachedFileDto, type FileObjectRecord } from './file-mapper';

export interface VehicleInspectionRecord {
  id: string;
  vehicleId: string;
  type: VehicleInspectionType;
  inspectedAt: Date;
  expiresAt: Date;
  cost: number | null;
  paymentMethod: PaymentMethod | null;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord | null;
}

export interface VehicleSummaryRecord {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toVehicleInspectionDto = (record: VehicleInspectionRecord): VehicleInspectionDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  type: record.type,
  inspectedAt: toIsoDate(record.inspectedAt),
  expiresAt: toIsoDate(record.expiresAt),
  cost: record.cost,
  paymentMethod: record.paymentMethod,
  file: toAttachedFileDto(record.file),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toExpiringVehicleInspectionDto = (
  record: VehicleInspectionRecord & { vehicle: VehicleSummaryRecord },
): ExpiringVehicleInspectionDto => ({
  ...toVehicleInspectionDto(record),
  vehicle: {
    id: record.vehicle.id,
    make: record.vehicle.make,
    model: record.vehicle.model,
    licensePlate: record.vehicle.licensePlate,
  },
});
