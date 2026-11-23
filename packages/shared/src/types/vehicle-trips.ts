import type { TripStatus } from './trip';

/**
 * Where a trip's revenue figure comes from: the issued invoice (gross, RSD), the cash ledger,
 * or — when neither exists yet — the agreed price, which is only an estimate.
 */
export type VehicleTripRevenueSource = 'INVOICE' | 'CASH' | 'PRICE' | 'NONE';

export interface VehicleTripRowDto {
  tripId: string;
  referenceNumber: string | null;
  departureDate: string;
  returnDate: string | null;
  route: string;
  client: string;
  status: TripStatus;
  drivers: string[];
  /** Vehicles assigned to the trip, this one included. */
  vehicleCount: number;
  /** Km this vehicle drove on the trip; null when no odometer or distance is entered. */
  km: number | null;
  /** This vehicle's share of the trip (0–1): by km when every vehicle has km, else equal. */
  share: number;
  revenue: number;
  revenueSource: VehicleTripRevenueSource;
  /** This vehicle's share of the trip expenses (fuel excluded; fuel is booked on the vehicle). */
  tripExpenses: number;
  result: number;
}

export interface VehicleTripsTotalsDto {
  tripCount: number;
  km: number;
  revenue: number;
  /** Part of `revenue` that is only the agreed price (not invoiced, no cash recorded). */
  estimatedRevenue: number;
  tripExpenses: number;
  fuelExpense: number;
  fuelLiters: number;
  maintenanceExpense: number;
  totalExpense: number;
  result: number;
  revenuePerKm: number | null;
  costPerKm: number | null;
}

export interface VehicleTripsMonthDto extends Omit<
  VehicleTripsTotalsDto,
  'revenuePerKm' | 'costPerKm' | 'fuelLiters'
> {
  /** `YYYY-MM` */
  month: string;
}

export interface VehicleTripsSummaryDto {
  from: string;
  to: string;
  totals: VehicleTripsTotalsDto;
  months: VehicleTripsMonthDto[];
  trips: VehicleTripRowDto[];
}
