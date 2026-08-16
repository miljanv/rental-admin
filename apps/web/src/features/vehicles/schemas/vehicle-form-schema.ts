import { vehicleWriteSchema, type VehicleWriteInput } from '@rental-admin/shared';

export const vehicleFormSchema = vehicleWriteSchema;

export type VehicleFormValues = VehicleWriteInput;

export const EMPTY_VEHICLE_FORM: VehicleFormValues = {
  make: '',
  model: '',
  year: new Date().getFullYear(),
  licensePlate: '',
  vin: '',
  engineNumber: '',
  enginePower: '',
  engineDisplacement: '',
  mass: '',
  seatCount: 1,
  standingCapacity: '',
  type: 'BUS',
  fuelType: 'DIESEL',
  tachographType: 'DIGITAL',
  status: 'ACTIVE',
  initialMileageKm: 0,
  currentMileage: 0,
};
