import {
  companyExpenseWriteSchema,
  type CompanyExpenseWriteInput,
} from '@rental-admin/shared';

export const companyExpenseFormSchema = companyExpenseWriteSchema;

export type CompanyExpenseFormValues = CompanyExpenseWriteInput;

export const EMPTY_COMPANY_EXPENSE_FORM: CompanyExpenseFormValues = {
  issuedAt: '',
  paidAt: '',
  supplier: '',
  description: '',
  amountWithoutVat: 0,
  vatAmount: 0,
  amountWithVat: 0,
  paymentMethod: '',
  vehicleId: '',
  odometerKm: null,
};
