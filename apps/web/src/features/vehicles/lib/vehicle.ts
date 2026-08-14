import type { VehicleDto, VehicleWriteRequest } from '@rental-admin/shared';

export const vehicleLabel = (
  vehicle: Pick<VehicleDto, 'make' | 'model' | 'licensePlate'>,
): string => `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;

export const toVehicleFormValues = (vehicle: VehicleDto): VehicleWriteRequest => ({
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year,
  licensePlate: vehicle.licensePlate,
  vin: vehicle.vin,
  seatCount: vehicle.seatCount,
  type: vehicle.type,
  fuelType: vehicle.fuelType,
  tachographType: vehicle.tachographType,
  status: vehicle.status,
  currentMileage: vehicle.currentMileage,
});
