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

/** A vehicle with no tachograph has nothing to calibrate — excluded everywhere calibration applies. */
export type CalibratedTachographType = Exclude<TachographType, 'NONE'>;

const CALIBRATION_INTERVAL_DAYS: Record<CalibratedTachographType, number> = {
  ANALOG: 365,
  DIGITAL: 730,
};

/** Calibration validity depends on the vehicle's own tachograph type, not a per-record choice. */
export const computeCalibrationExpiry = (
  tachographType: CalibratedTachographType,
  calibratedAt: string,
): string => addUtcDays(calibratedAt, CALIBRATION_INTERVAL_DAYS[tachographType]);
