import {
  bankStatementEntryWriteSchema,
  type BankStatementEntryWriteInput,
  type BankStatementEntryWriteRequest,
} from '@rental-admin/shared';

export const bankStatementEntryFormSchema = bankStatementEntryWriteSchema;

export type BankStatementEntryFormValues = BankStatementEntryWriteInput;
export type BankStatementEntryFormOutput = BankStatementEntryWriteRequest;

export const EMPTY_BANK_STATEMENT_ENTRY_FORM: BankStatementEntryFormValues = {
  type: 'INCOME',
  category: 'CONTRACT',
  amount: 0,
  occurredAt: '',
  statementNumber: '',
  bankReference: '',
  note: '',
  supplier: '',
  partner: '',
  route: '',
  vehicleId: '',
  driverId: '',
  contractId: '',
};
