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
  engineNumber: vehicle.engineNumber,
  enginePower: vehicle.enginePower,
  engineDisplacement: vehicle.engineDisplacement,
  mass: vehicle.mass,
  seatCount: vehicle.seatCount,
  standingCapacity: vehicle.standingCapacity,
  type: vehicle.type,
  fuelType: vehicle.fuelType,
  tachographType: vehicle.tachographType,
  status: vehicle.status,
  initialMileageKm: vehicle.initialMileageKm,
  currentMileage: vehicle.currentMileage,
});
