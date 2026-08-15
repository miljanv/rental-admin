import {
  transactionWriteSchema,
  type TransactionWriteInput,
  type TransactionWriteRequest,
} from '@rental-admin/shared';

export const transactionFormSchema = transactionWriteSchema;

export type TransactionFormValues = TransactionWriteInput;
export type TransactionFormOutput = TransactionWriteRequest;

export const EMPTY_TRANSACTION_FORM: TransactionFormValues = {
  type: 'EXPENSE',
  category: 'OTHER',
  amount: 0,
  occurredAt: '',
  paymentMethod: 'ACCOUNT',
  note: '',
  supplier: '',
  partner: '',
  route: '',
  vehicleId: '',
  driverId: '',
  contractId: '',
  isAdvance: false,
};
