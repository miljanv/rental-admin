import {
  tripExpenseWriteSchema,
  type TripExpenseWriteInput,
  type TripExpenseWriteRequest,
} from '@rental-admin/shared';

export const tripExpenseFormSchema = tripExpenseWriteSchema;

export type TripExpenseFormValues = TripExpenseWriteInput;
export type TripExpenseFormOutput = TripExpenseWriteRequest;

export const EMPTY_TRIP_EXPENSE_FORM: TripExpenseFormValues = {
  category: 'FUEL',
  amount: 0,
  paymentMethod: 'CASH',
  note: '',
  fileId: '',
};
