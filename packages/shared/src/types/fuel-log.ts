import type { PaymentMethod } from './transaction';

export const FUEL_LOG_FUEL_TYPES = ['DIESEL', 'ADBLUE'] as const;

export type FuelLogFuelType = (typeof FUEL_LOG_FUEL_TYPES)[number];

export const FUEL_LOG_FUEL_TYPE_LABELS: Record<FuelLogFuelType, string> = {
  DIESEL: 'Dizel',
  ADBLUE: 'AdBlue',
};

/** Common suppliers offered in the dropdown; the user can still type a new name. */
export const SUGGESTED_FUEL_SUPPLIERS = ['OMV', 'NIS', 'EuroWag', 'EW', 'MOL', 'Shell'] as const;

export interface FuelLogDriverDto {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FuelLogVehicleDto {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
}

export interface FuelLogDto {
  id: string;
  vehicleId: string;
  vehicle: FuelLogVehicleDto;
  fueledAt: string;
  location: string;
  driver: FuelLogDriverDto | null;
  fuelType: FuelLogFuelType;
  litersFilled: number;
  odometerKm: number;
  cost: number | null;
  paymentMethod: PaymentMethod | null;
  supplier: string;
  note: string | null;
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

export interface FuelLogSuppliersDto {
  suppliers: string[];
}

export interface FuelConsumptionSummaryDto {
  fillCount: number;
  litersFilled: number;
  kmDriven: number | null;
  avgConsumptionPer100Km: number | null;
}

export interface FuelConsumptionHistoryDto {
  vehicleId: string;
  from: string | null;
  to: string | null;
  items: FuelLogDto[];
  diesel: FuelConsumptionSummaryDto;
  adblue: FuelConsumptionSummaryDto;
}

const CONSUMPTION_ROUND_FACTOR = 100;

const roundConsumption = (value: number): number =>
  Math.round(value * CONSUMPTION_ROUND_FACTOR) / CONSUMPTION_ROUND_FACTOR;

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

  return {
    kmDriven,
    consumptionPer100Km: roundConsumption((litersFilled / kmDriven) * CONSUMPTION_ROUND_FACTOR),
  };
};

/** Closest earlier odometer from DB and in-flight bulk rows for the same vehicle. */
export const closestEarlierOdometer = (
  currentOdometerKm: number,
  candidates: Array<number | null | undefined>,
): number | null => {
  const earlier = candidates.filter(
    (value): value is number => typeof value === 'number' && value < currentOdometerKm,
  );

  if (earlier.length === 0) {
    return null;
  }

  return Math.max(...earlier);
};

export const summarizeFuelLogs = (items: FuelLogDto[]): FuelConsumptionSummaryDto => {
  const withDistance = items.filter((item) => item.kmDriven !== null && item.kmDriven > 0);
  const litersFilled = items.reduce((sum, item) => sum + item.litersFilled, 0);
  const kmDriven = withDistance.reduce((sum, item) => sum + (item.kmDriven ?? 0), 0);
  const litersForAverage = withDistance.reduce((sum, item) => sum + item.litersFilled, 0);

  return {
    fillCount: items.length,
    litersFilled: roundConsumption(litersFilled),
    kmDriven: kmDriven > 0 ? kmDriven : null,
    avgConsumptionPer100Km:
      kmDriven > 0 ? roundConsumption((litersForAverage / kmDriven) * CONSUMPTION_ROUND_FACTOR) : null,
  };
};

export const mergeFuelSuppliers = (stored: string[]): string[] => {
  const names = new Set<string>(SUGGESTED_FUEL_SUPPLIERS);

  for (const name of stored) {
    const trimmed = name.trim();

    if (trimmed) {
      names.add(trimmed);
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right, 'sr'));
};
