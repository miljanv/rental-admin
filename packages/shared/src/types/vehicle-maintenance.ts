import type { PaymentMethod } from './transaction';

export interface VehicleMaintenanceDto {
  id: string;
  vehicleId: string;
  date: string;
  odometerKm: number;
  partName: string;
  supplier: string;
  cost: number;
  paymentMethod: PaymentMethod;
  mechanic: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteVehicleMaintenanceResult {
  id: string;
  deleted: true;
}

export interface MaintenanceCostBySupplier {
  supplier: string;
  total: number;
  count: number;
}

/**
 * Aggregated cost across whichever combination of vehicle/period/supplier the
 * caller filtered by. Kept generic (not vehicle-scoped) so a future Finansije
 * view can reuse it fleet-wide.
 */
export interface MaintenanceCostSummaryDto {
  total: number;
  count: number;
  bySupplier: MaintenanceCostBySupplier[];
}
