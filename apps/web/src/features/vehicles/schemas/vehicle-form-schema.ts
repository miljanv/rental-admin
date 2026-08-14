import { vehicleWriteSchema, type VehicleWriteRequest } from '@rental-admin/shared';

export const vehicleFormSchema = vehicleWriteSchema;

export type VehicleFormValues = VehicleWriteRequest;

export const EMPTY_VEHICLE_FORM: VehicleFormValues = {
  make: '',
  model: '',
  year: new Date().getFullYear(),
  licensePlate: '',
  vin: '',
  seatCount: 1,
  type: 'BUS',
  fuelType: 'DIESEL',
  tachographType: 'DIGITAL',
  status: 'ACTIVE',
  currentMileage: 0,
};
