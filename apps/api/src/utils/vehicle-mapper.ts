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
  engineNumber: string | null;
  enginePower: number | null;
  engineDisplacement: number | null;
  mass: number | null;
  seatCount: number;
  standingCapacity: number | null;
  type: VehicleType;
  fuelType: VehicleFuelType;
  tachographType: TachographType;
  status: VehicleStatus;
  initialMileageKm: number;
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
  engineNumber: record.engineNumber,
  enginePower: record.enginePower,
  engineDisplacement: record.engineDisplacement,
  mass: record.mass,
  seatCount: record.seatCount,
  standingCapacity: record.standingCapacity,
  type: record.type,
  fuelType: record.fuelType,
  tachographType: record.tachographType,
  status: record.status,
  initialMileageKm: record.initialMileageKm,
  currentMileage: record.currentMileage,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
