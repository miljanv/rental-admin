import {
  vehicleInspectionWriteSchema,
  type VehicleInspectionWriteInput,
} from '@rental-admin/shared';

export const vehicleInspectionFormSchema = vehicleInspectionWriteSchema;

export type VehicleInspectionFormValues = VehicleInspectionWriteInput;

export const EMPTY_INSPECTION_FORM: VehicleInspectionFormValues = {
  type: 'REGULAR',
  inspectedAt: '',
  fileId: '',
};
