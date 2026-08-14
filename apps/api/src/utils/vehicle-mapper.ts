import type {
  TachographType,
  VehicleDto,
  VehicleFuelType,
  VehicleStatus,
  VehicleType,
} from '@rental-admin/shared';

export interface VehicleRecord {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  seatCount: number;
  type: VehicleType;
  fuelType: VehicleFuelType;
  tachographType: TachographType;
  status: VehicleStatus;
  currentMileage: number;
  createdAt: Date;
  updatedAt: Date;
}

export const toVehicleDto = (record: VehicleRecord): VehicleDto => ({
  id: record.id,
  make: record.make,
  model: record.model,
  year: record.year,
  licensePlate: record.licensePlate,
  vin: record.vin,
  seatCount: record.seatCount,
  type: record.type,
  fuelType: record.fuelType,
  tachographType: record.tachographType,
  status: record.status,
  currentMileage: record.currentMileage,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
