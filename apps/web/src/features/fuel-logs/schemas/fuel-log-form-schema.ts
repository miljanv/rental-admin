import { fuelLogCreateSchema, type FuelLogCreateInput } from '@rental-admin/shared';

export const fuelLogFormSchema = fuelLogCreateSchema;

export type FuelLogFormValues = FuelLogCreateInput;

export const EMPTY_FUEL_LOG_FORM: FuelLogFormValues = {
  vehicleId: '',
  fueledAt: '',
  location: '',
  driverId: '',
  fuelType: 'DIESEL',
  litersFilled: 0,
  odometerKm: 0,
  cost: null,
  paymentMethod: '',
  supplier: '',
  note: '',
};
