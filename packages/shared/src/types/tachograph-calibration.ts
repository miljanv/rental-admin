import type { AttachedFileDto } from './file';
import type { PaymentMethod } from './transaction';
import type { TachographType } from './vehicle';
import { addUtcDays } from './vehicle-inspection';

export interface TachographCalibrationDto {
  id: string;
  vehicleId: string;
  calibratedAt: string;
  expiresAt: string;
  cost: number | null;
  paymentMethod: PaymentMethod | null;
  file: AttachedFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiringTachographCalibrationDto extends TachographCalibrationDto {
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
    tachographType: TachographType;
  };
}

export interface DeleteTachographCalibrationResult {
  id: string;
  deleted: true;
}

const CALIBRATION_INTERVAL_DAYS: Record<TachographType, number> = {
  ANALOG: 365,
  DIGITAL: 730,
};

/** Calibration validity depends on the vehicle's own tachograph type, not a per-record choice. */
export const computeCalibrationExpiry = (
  tachographType: TachographType,
  calibratedAt: string,
): string => addUtcDays(calibratedAt, CALIBRATION_INTERVAL_DAYS[tachographType]);
