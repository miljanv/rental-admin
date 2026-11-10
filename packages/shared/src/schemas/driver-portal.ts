import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import {
  DRIVER_EXPENSE_PAYMENT_METHODS,
  DRIVER_REPORT_STATUSES,
  MAX_DRIVER_REPORT_EXPENSES,
} from '../types/driver-portal';
import { MAX_TRIP_VEHICLES } from '../types/trip';
import {
  refineTripVehicleKm,
  tripExpenseCategorySchema,
  tripExpensePaymentMethodSchema,
  tripVehicleKmSchema,
} from './trip-expense';
import { tripIdSchema } from './trip';
import { isoDateSchema } from './driver';
import { optionalFileId } from './vehicle-document';

const optionalText = (max: number, label: string) =>
  z
    .union([
      z.string().trim().max(max, `${label} sme imati najviše ${max} karaktera.`),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null));

export const driverPortalTripParamsSchema = z.object({ id: tripIdSchema });

export type DriverPortalTripParams = z.infer<typeof driverPortalTripParamsSchema>;

export const driverReportExpenseSchema = z.object({
  /** Set when the driver edits an expense sent earlier. */
  id: z
    .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  category: tripExpenseCategorySchema,
  amount: z
    .number({ error: 'Unesite iznos.' })
    .positive('Iznos mora biti veći od nule.')
    .max(100_000_000, 'Iznos nije ispravan.'),
  paymentMethod: z.enum(DRIVER_EXPENSE_PAYMENT_METHODS),
  note: optionalText(500, 'Napomena'),
  fileId: optionalFileId,
});

export type DriverReportExpenseInput = z.input<typeof driverReportExpenseSchema>;
export type DriverReportExpenseRequest = z.output<typeof driverReportExpenseSchema>;

/** What the driver sends for one trip: odometer per vehicle, expenses and a note. */
export const driverReportWriteSchema = z
  .object({
    vehicles: z
      .array(tripVehicleKmSchema)
      .max(MAX_TRIP_VEHICLES, `Najviše ${MAX_TRIP_VEHICLES} vozila po vožnji.`)
      .default([]),
    expenses: z
      .array(driverReportExpenseSchema)
      .max(MAX_DRIVER_REPORT_EXPENSES, `Najviše ${MAX_DRIVER_REPORT_EXPENSES} troškova po vožnji.`)
      .default([]),
    note: optionalText(500, 'Napomena'),
  })
  .superRefine((value, ctx) => {
    refineTripVehicleKm(value.vehicles, ctx, ['vehicles']);

    const ids = value.expenses.map((expense) => expense.id).filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['expenses'],
        message: 'Isti trošak je poslat dva puta.',
      });
    }

    const fileIds = value.expenses.map((expense) => expense.fileId).filter(Boolean);

    if (new Set(fileIds).size !== fileIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['expenses'],
        message: 'Isti račun je priložen uz dva troška.',
      });
    }
  });

export type DriverReportWriteInput = z.input<typeof driverReportWriteSchema>;
export type DriverReportWriteRequest = z.output<typeof driverReportWriteSchema>;

const reportIdSchema = z.string().trim().min(1, 'Unos je obavezan.').max(64);

export const driverReportParamsSchema = z.object({ id: reportIdSchema });

export type DriverReportParams = z.infer<typeof driverReportParamsSchema>;

export const listDriverReportsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.page),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION_DEFAULTS.maxLimit)
      .default(PAGINATION_DEFAULTS.limit),
    status: z.enum(DRIVER_REPORT_STATUSES).optional(),
    driverId: z.string().trim().min(1).max(64).optional(),
    /** Inclusive range on the trip's departure date. */
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'Krajnji datum ne može biti pre početnog.',
  });

export type ListDriverReportsQuery = z.output<typeof listDriverReportsQuerySchema>;
export type ListDriverReportsQueryInput = z.input<typeof listDriverReportsQuerySchema>;

/** The office's decision on each pending expense; it may correct one before accepting it. */
export const acceptDriverReportSchema = z.object({
  expenses: z
    .array(
      z.object({
        id: reportIdSchema,
        accept: z.boolean(),
        category: tripExpenseCategorySchema.optional(),
        amount: z
          .number({ error: 'Unesite iznos.' })
          .positive('Iznos mora biti veći od nule.')
          .max(100_000_000, 'Iznos nije ispravan.')
          .optional(),
        paymentMethod: tripExpensePaymentMethodSchema.optional(),
      }),
    )
    .max(MAX_DRIVER_REPORT_EXPENSES)
    .default([]),
  comment: optionalText(500, 'Komentar'),
});

export type AcceptDriverReportInput = z.input<typeof acceptDriverReportSchema>;
export type AcceptDriverReportRequest = z.output<typeof acceptDriverReportSchema>;

export const returnDriverReportSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(3, 'Napišite vozaču šta treba da ispravi.')
    .max(500, 'Komentar sme imati najviše 500 karaktera.'),
});

export type ReturnDriverReportRequest = z.output<typeof returnDriverReportSchema>;
