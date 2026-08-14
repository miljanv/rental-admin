import type {
  ExpiringVehicleSafetyEquipmentDto,
  SafetyEquipmentType,
  VehicleSafetyEquipmentDto,
} from '@rental-admin/shared';

export interface VehicleSafetyEquipmentRecord {
  id: string;
  vehicleId: string;
  type: SafetyEquipmentType;
  checkedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
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
