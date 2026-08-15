import type { PaymentMethod } from './transaction';

export const FUEL_LOG_FUEL_TYPES = ['DIESEL', 'ADBLUE'] as const;

export type FuelLogFuelType = (typeof FUEL_LOG_FUEL_TYPES)[number];

export const FUEL_LOG_FUEL_TYPE_LABELS: Record<FuelLogFuelType, string> = {
  DIESEL: 'Dizel',
  ADBLUE: 'AdBlue',
};

export interface FuelLogDriverDto {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FuelLogDto {
  id: string;
  vehicleId: string;
  fueledAt: string;
  location: string;
  driver: FuelLogDriverDto | null;
  fuelType: FuelLogFuelType;
  litersFilled: number;
  odometerKm: number;
  cost: number | null;
  paymentMethod: PaymentMethod | null;
  supplier: string | null;
  /** Null when there is no earlier reading for this vehicle to compare against. */
  kmDriven: number | null;
  /** L/100km. Null whenever `kmDriven` is null or zero (can't be computed meaningfully). */
  consumptionPer100Km: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteFuelLogResult {
  id: string;
  deleted: true;
}

const CONSUMPTION_ROUND_FACTOR = 100;

/**
 * `pređeno km` = this reading − the closest earlier odometer reading for the
 * same vehicle (any fuel type, since the odometer is a vehicle-wide counter).
 * `potrošnja` = (toceno_litara / predjeno_km) × 100, i.e. L/100km. Both are
 * null when there is no earlier reading, or the reading didn't advance
 * (divide-by-zero guard) — a real gap, not a value to fake.
 */
export const computeFuelLogDerivedFields = (
  odometerKm: number,
  previousOdometerKm: number | null,
  litersFilled: number,
): { kmDriven: number | null; consumptionPer100Km: number | null } => {
  if (previousOdometerKm === null) {
    return { kmDriven: null, consumptionPer100Km: null };
  }

  const kmDriven = odometerKm - previousOdometerKm;

  if (kmDriven <= 0) {
    return { kmDriven, consumptionPer100Km: null };
  }

  const consumption =
    Math.round((litersFilled / kmDriven) * CONSUMPTION_ROUND_FACTOR * CONSUMPTION_ROUND_FACTOR) /
    CONSUMPTION_ROUND_FACTOR;

  return { kmDriven, consumptionPer100Km: consumption };
};
