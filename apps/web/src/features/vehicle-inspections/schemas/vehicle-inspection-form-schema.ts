import {
  vehicleInspectionWriteSchema,
  type VehicleInspectionWriteRequest,
} from '@rental-admin/shared';

export const vehicleInspectionFormSchema = vehicleInspectionWriteSchema;

export type VehicleInspectionFormValues = VehicleInspectionWriteRequest;

export const EMPTY_INSPECTION_FORM: VehicleInspectionFormValues = {
  type: 'REGULAR',
  inspectedAt: '',
};
