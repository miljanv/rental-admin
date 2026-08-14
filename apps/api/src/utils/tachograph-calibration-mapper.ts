import type {
  ExpiringTachographCalibrationDto,
  TachographCalibrationDto,
  TachographType,
} from '@rental-admin/shared';

export interface TachographCalibrationRecord {
  id: string;
  vehicleId: string;
  calibratedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleSummaryRecord {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  tachographType: TachographType;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toTachographCalibrationDto = (
  record: TachographCalibrationRecord,
): TachographCalibrationDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  calibratedAt: toIsoDate(record.calibratedAt),
  expiresAt: toIsoDate(record.expiresAt),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toExpiringTachographCalibrationDto = (
  record: TachographCalibrationRecord & { vehicle: VehicleSummaryRecord },
): ExpiringTachographCalibrationDto => ({
  ...toTachographCalibrationDto(record),
  vehicle: {
    id: record.vehicle.id,
    make: record.vehicle.make,
    model: record.vehicle.model,
    licensePlate: record.vehicle.licensePlate,
    tachographType: record.vehicle.tachographType,
  },
});
