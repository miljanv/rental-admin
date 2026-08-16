import { partnerWriteSchema, type PartnerWriteInput } from '@rental-admin/shared';

export const partnerFormSchema = partnerWriteSchema;

export type PartnerFormValues = PartnerWriteInput;

export const EMPTY_PARTNER_FORM: PartnerFormValues = {
  type: 'TRAVEL_AGENCY',
  companyName: '',
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  nickname: '',
  pib: '',
  registrationNumber: '',
  personalId: '',
};
