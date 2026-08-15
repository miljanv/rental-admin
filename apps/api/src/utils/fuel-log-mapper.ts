import type { FuelLogDto, FuelLogFuelType, PaymentMethod } from '@rental-admin/shared';

export interface FuelLogDriverRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FuelLogRecord {
  id: string;
  vehicleId: string;
  fueledAt: Date;
  location: string;
  driverId: string | null;
  fuelType: FuelLogFuelType;
  litersFilled: number;
  odometerKm: number;
  cost: number | null;
  paymentMethod: PaymentMethod | null;
  supplier: string | null;
  kmDriven: number | null;
  consumptionPer100Km: number | null;
  createdAt: Date;
  updatedAt: Date;
  driver: FuelLogDriverRecord | null;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toFuelLogDto = (record: FuelLogRecord): FuelLogDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  fueledAt: toIsoDate(record.fueledAt),
  location: record.location,
  driver: record.driver
    ? { id: record.driver.id, firstName: record.driver.firstName, lastName: record.driver.lastName }
    : null,
  fuelType: record.fuelType,
  litersFilled: record.litersFilled,
  odometerKm: record.odometerKm,
  cost: record.cost,
  paymentMethod: record.paymentMethod,
  supplier: record.supplier,
  kmDriven: record.kmDriven,
  consumptionPer100Km: record.consumptionPer100Km,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
