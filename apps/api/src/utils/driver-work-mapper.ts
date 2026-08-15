import type { DriverDriveDto, FuelLogFuelType } from '@rental-admin/shared';

export interface DriverWorkFuelLogRecord {
  id: string;
  fueledAt: Date;
  location: string;
  kmDriven: number | null;
  fuelType: FuelLogFuelType;
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toVehicleLabel = (vehicle: DriverWorkFuelLogRecord['vehicle']): string =>
  `${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`;

export const toDriverDriveDto = (record: DriverWorkFuelLogRecord): DriverDriveDto => ({
  id: record.id,
  fueledAt: toIsoDate(record.fueledAt),
  vehicleId: record.vehicle.id,
  vehicleLabel: toVehicleLabel(record.vehicle),
  location: record.location,
  kmDriven: record.kmDriven,
  fuelType: record.fuelType,
});
