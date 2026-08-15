import type {
  ExpiringTachographCalibrationDto,
  PaymentMethod,
  TachographCalibrationDto,
  TachographType,
} from '@rental-admin/shared';

import { toAttachedFileDto, type FileObjectRecord } from './file-mapper';

export interface TachographCalibrationRecord {
  id: string;
  vehicleId: string;
  calibratedAt: Date;
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
  cost: record.cost,
  paymentMethod: record.paymentMethod,
  file: toAttachedFileDto(record.file),
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
