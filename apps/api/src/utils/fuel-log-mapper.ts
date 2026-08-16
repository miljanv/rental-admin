import type { FuelLogDto, FuelLogFuelType, PaymentMethod } from '@rental-admin/shared';

export interface FuelLogDriverRecord {
  id: string;
  firstName: string;
  lastName: string;
}

export interface FuelLogVehicleRecord {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
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
  supplier: string;
  note: string | null;
  kmDriven: number | null;
  consumptionPer100Km: number | null;
  createdAt: Date;
  updatedAt: Date;
  driver: FuelLogDriverRecord | null;
  vehicle: FuelLogVehicleRecord;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toFuelLogDto = (record: FuelLogRecord): FuelLogDto => ({
  id: record.id,
  vehicleId: record.vehicleId,
  vehicle: {
    id: record.vehicle.id,
    make: record.vehicle.make,
    model: record.vehicle.model,
    licensePlate: record.vehicle.licensePlate,
  },
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
  note: record.note,
  kmDriven: record.kmDriven,
  consumptionPer100Km: record.consumptionPer100Km,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
