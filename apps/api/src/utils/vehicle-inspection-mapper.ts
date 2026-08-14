import type {
  ExpiringVehicleInspectionDto,
  VehicleInspectionDto,
  VehicleInspectionType,
} from '@rental-admin/shared';

export interface VehicleInspectionRecord {
  id: string;
  vehicleId: string;
  type: VehicleInspectionType;
  inspectedAt: Date;
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

export const toVehicleInspectionDto = (record: VehicleInspectionRecord): VehicleInspectionDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  type: record.type,
  inspectedAt: toIsoDate(record.inspectedAt),
  expiresAt: toIsoDate(record.expiresAt),
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
