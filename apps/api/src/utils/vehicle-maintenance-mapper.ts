import type { PaymentMethod, VehicleMaintenanceDto } from '@rental-admin/shared';

export interface VehicleMaintenanceRecord {
  id: string;
  vehicleId: string;
  date: Date;
  odometerKm: number;
  partName: string;
  supplier: string;
  cost: number;
  paymentMethod: PaymentMethod;
  mechanic: string;
  createdAt: Date;
  updatedAt: Date;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toVehicleMaintenanceDto = (record: VehicleMaintenanceRecord): VehicleMaintenanceDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  date: toIsoDate(record.date),
  odometerKm: record.odometerKm,
  partName: record.partName,
  supplier: record.supplier,
  cost: record.cost,
  paymentMethod: record.paymentMethod,
  mechanic: record.mechanic,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
