import {
  vehicleDocumentWriteSchema,
  type VehicleDocumentWriteInput,
} from '@rental-admin/shared';

export const vehicleDocumentFormSchema = vehicleDocumentWriteSchema;

export type VehicleDocumentFormValues = VehicleDocumentWriteInput;

export const EMPTY_VEHICLE_DOCUMENT_FORM: VehicleDocumentFormValues = {
  type: 'REGISTRATION',
  issuedAt: '',
  fileId: '',
};
