import type { AttachedFileDto } from './file';

export const VEHICLE_INSPECTION_TYPES = ['REGULAR', 'SEMI_ANNUAL', 'MONTHLY'] as const;

export type VehicleInspectionType = (typeof VEHICLE_INSPECTION_TYPES)[number];

export const VEHICLE_INSPECTION_TYPE_LABELS: Record<VehicleInspectionType, string> = {
  REGULAR: 'Redovni',
  SEMI_ANNUAL: 'Šestomesečni',
  MONTHLY: 'Mesečni',
};

export interface VehicleInspectionDto {
  id: string;
  vehicleId: string;
  type: VehicleInspectionType;
  inspectedAt: string;
  expiresAt: string;
  file: AttachedFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiringVehicleInspectionDto extends VehicleInspectionDto {
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };
}

export interface DeleteVehicleInspectionResult {
  id: string;
  deleted: true;
}

const toUtcDate = (isoDate: string): Date => new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Calendar-correct day arithmetic on an ISO date, in UTC. */
export const addUtcDays = (isoDate: string, days: number): string => {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
};

/** Calendar-correct month arithmetic on an ISO date, in UTC (handles day overflow). */
export const addUtcMonths = (isoDate: string, months: number): string => {
  const date = toUtcDate(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toIsoDate(date);
};

/**
 * Expiry rule per inspection type, computed purely from the inspection's own
 * date. Regular inspections both renew the vehicle's registration and expire
 * with it, so "od registracije" and "od pregleda" are the same event here.
 */
export const computeInspectionExpiry = (
  type: VehicleInspectionType,
  inspectedAt: string,
): string => {
  switch (type) {
    case 'REGULAR':
      return addUtcMonths(inspectedAt, 12);
    case 'SEMI_ANNUAL':
      return addUtcMonths(inspectedAt, 6);
    case 'MONTHLY':
      return addUtcDays(inspectedAt, 30);
    default:
      return inspectedAt;
  }
};

const EARLIEST_SCHEDULE_WINDOW_DAYS: Partial<Record<VehicleInspectionType, number>> = {
  REGULAR: 30,
  SEMI_ANNUAL: 15,
};

/** Earliest date the next inspection of this type may be scheduled, or null if there is no early window. */
export const earliestScheduleDate = (
  type: VehicleInspectionType,
  expiresAt: string,
): string | null => {
  const window = EARLIEST_SCHEDULE_WINDOW_DAYS[type];
  return window ? addUtcDays(expiresAt, -window) : null;
};
