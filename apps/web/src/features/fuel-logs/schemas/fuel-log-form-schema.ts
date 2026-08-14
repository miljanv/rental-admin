import { fuelLogWriteSchema, type FuelLogWriteInput } from '@rental-admin/shared';

export const fuelLogFormSchema = fuelLogWriteSchema;

export type FuelLogFormValues = FuelLogWriteInput;

export const EMPTY_FUEL_LOG_FORM: FuelLogFormValues = {
  fueledAt: '',
  location: '',
  driverId: '',
  fuelType: 'DIESEL',
  litersFilled: 0,
  odometerKm: 0,
};
