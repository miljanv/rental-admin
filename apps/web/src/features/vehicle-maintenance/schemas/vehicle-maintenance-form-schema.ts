import {
  vehicleMaintenanceWriteSchema,
  type VehicleMaintenanceWriteRequest,
} from '@rental-admin/shared';

export const vehicleMaintenanceFormSchema = vehicleMaintenanceWriteSchema;

export type VehicleMaintenanceFormValues = VehicleMaintenanceWriteRequest;

export const EMPTY_MAINTENANCE_FORM: VehicleMaintenanceFormValues = {
  date: '',
  odometerKm: 0,
  partName: '',
  supplier: '',
  cost: 0,
  paymentMethod: 'ACCOUNT',
  mechanic: '',
};
