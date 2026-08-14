import { driverDocumentWriteSchema, type DriverDocumentWriteInput } from '@rental-admin/shared';

export const driverDocumentFormSchema = driverDocumentWriteSchema;

export type DriverDocumentFormValues = DriverDocumentWriteInput;

export const EMPTY_DOCUMENT_FORM: DriverDocumentFormValues = {
  type: 'DRIVING_LICENSE',
  documentNumber: '',
  issuedAt: '',
  expiresAt: '',
  employmentContractType: '',
  fileId: '',
};
