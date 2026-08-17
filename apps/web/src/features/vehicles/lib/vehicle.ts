import type { VehicleDto, VehicleWriteRequest } from '@rental-admin/shared';
import { createElement, type ReactNode } from 'react';

export const vehicleLabel = (
  vehicle: Pick<VehicleDto, 'make' | 'model' | 'licensePlate'>,
): string => `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;

/**
 * Reg. oznaka first and bolded, make/model as secondary detail — dispatchers
 * recognize a vehicle by its plate, not its brand. Used in vehicle pickers on
 * the trip forms.
 */
export const vehicleSelectLabel = (
  vehicle: Pick<VehicleDto, 'make' | 'model' | 'licensePlate'>,
): ReactNode =>
  createElement(
    'span',
    null,
    createElement('strong', null, vehicle.licensePlate),
    ` — ${vehicle.make} ${vehicle.model}`,
  );

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
