import { contractWriteSchema, type ContractWriteInput } from '@rental-admin/shared';

export const contractFormSchema = contractWriteSchema;

export type ContractFormValues = ContractWriteInput;

export const EMPTY_CONTRACT_FORM: ContractFormValues = {
  partnerId: '',
  vehicleId: '',
  driverId: '',
  conclusionDate: '',
  origin: '',
  destination: '',
  serviceStartDate: '',
  serviceEndDate: '',
  passengerCount: 1,
  price: 0,
  advancePercentage: 0,
  status: 'DRAFT',
  notes: '',
  isInternational: false,
  clientType: 'TRAVEL_AGENCY',
  clientCompanyName: '',
  clientFirstName: '',
  clientLastName: '',
  clientAddress: '',
  clientPib: '',
  clientRegistrationNumber: '',
  clientPersonalId: '',
};
