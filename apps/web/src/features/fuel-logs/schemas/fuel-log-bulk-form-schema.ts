import type { FuelLogFuelType } from '@rental-admin/shared';

export interface FuelLogBulkRowValues {
  vehicleId: string;
  driverId: string;
  fuelType: FuelLogFuelType | '';
  litersFilled: number | '';
  odometerKm: number | '';
  note: string;
}

export const EMPTY_BULK_ROW: FuelLogBulkRowValues = {
  vehicleId: '',
  driverId: '',
  fuelType: '',
  litersFilled: '',
  odometerKm: '',
  note: '',
};

export const EMPTY_BULK_FORM: {
  fueledAt: string;
  supplier: string;
  location: string;
  fuelType: FuelLogFuelType;
  rows: FuelLogBulkRowValues[];
} = {
  fueledAt: '',
  supplier: '',
  location: '',
  fuelType: 'DIESEL',
  rows: [{ ...EMPTY_BULK_ROW }, { ...EMPTY_BULK_ROW }, { ...EMPTY_BULK_ROW }],
};
