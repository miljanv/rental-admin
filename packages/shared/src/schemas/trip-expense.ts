import { z } from 'zod';

import { MAX_TRIP_DRIVERS } from '../types/trip';
import { TRIP_EXPENSE_CATEGORIES, TRIP_EXPENSE_PAYMENT_METHODS } from '../types/trip-expense';
import { driverIdSchema } from './driver';
import { optionalId, optionalIsoDate, optionalNonNegative, tripIdSchema } from './trip';
import { optionalFileId } from './vehicle-document';

export const tripExpenseCategorySchema = z.enum(TRIP_EXPENSE_CATEGORIES);
export const tripExpensePaymentMethodSchema = z.enum(TRIP_EXPENSE_PAYMENT_METHODS);

export const tripExpenseIdSchema = z.string().trim().min(1, 'Trošak je obavezan.').max(64);

export const tripExpenseParamsSchema = z.object({
  id: tripIdSchema,
  expenseId: tripExpenseIdSchema,
});

export type TripExpenseParams = z.infer<typeof tripExpenseParamsSchema>;

const optionalNote = z
  .union([
    z.string().trim().max(500, 'Napomena sme imati najviše 500 karaktera.'),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .transform((value) => (value ? value : null));

export const tripExpenseWriteSchema = z.object({
  category: tripExpenseCategorySchema,
  amount: z.number().positive('Iznos mora biti veći od nule.').max(10_000_000, 'Iznos nije ispravan.'),
  paymentMethod: tripExpensePaymentMethodSchema,
  note: optionalNote,
  fileId: optionalFileId,
});

export type TripExpenseWriteInput = z.input<typeof tripExpenseWriteSchema>;
export type TripExpenseWriteRequest = z.output<typeof tripExpenseWriteSchema>;

export const tripDriverAllowanceSchema = z.object({
  driverId: driverIdSchema,
  perDiemAmount: optionalNonNegative('Dnevnica', 10_000_000),
  advanceAmount: optionalNonNegative('Akontacija', 10_000_000),
});

export const tripSettlementWriteSchema = z.object({
  paidAt: optionalIsoDate,
  carrierId: optionalId,
  drivers: z
    .array(tripDriverAllowanceSchema)
    .max(MAX_TRIP_DRIVERS, `Najviše ${MAX_TRIP_DRIVERS} vozača po vožnji.`)
    .optional(),
});

export type TripSettlementWriteInput = z.input<typeof tripSettlementWriteSchema>;
export type TripSettlementWriteRequest = z.output<typeof tripSettlementWriteSchema>;
