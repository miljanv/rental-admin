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
  amount: 0,
  paymentMethod: '',
  vehicleId: '',
  odometerKm: null,
};
