import type {
  ExpiringVehicleSafetyEquipmentDto,
  SafetyEquipmentType,
  VehicleSafetyEquipmentDto,
} from '@rental-admin/shared';

import { toAttachedFileDto, type FileObjectRecord } from './file-mapper';

export interface VehicleSafetyEquipmentRecord {
  id: string;
  vehicleId: string;
  type: SafetyEquipmentType;
  checkedAt: Date;
  expiresAt: Date;
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

export const toVehicleSafetyEquipmentDto = (
  record: VehicleSafetyEquipmentRecord,
): VehicleSafetyEquipmentDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  type: record.type,
  checkedAt: toIsoDate(record.checkedAt),
  expiresAt: toIsoDate(record.expiresAt),
  file: toAttachedFileDto(record.file),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toExpiringVehicleSafetyEquipmentDto = (
  record: VehicleSafetyEquipmentRecord & { vehicle: VehicleSummaryRecord },
): ExpiringVehicleSafetyEquipmentDto => ({
  ...toVehicleSafetyEquipmentDto(record),
  vehicle: {
    id: record.vehicle.id,
    make: record.vehicle.make,
    model: record.vehicle.model,
    licensePlate: record.vehicle.licensePlate,
  },
});
