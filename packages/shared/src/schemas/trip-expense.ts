import { z } from 'zod';

import { MAX_TRIP_DRIVERS, MAX_TRIP_VEHICLES } from '../types/trip';
import { ADVANCE_STATUSES, PER_DIEM_CURRENCIES, PER_DIEM_STATUSES } from '../types/trip';
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
  amount: z.number().positive('Iznos mora biti veći od nule.').max(100_000_000_000, 'Iznos nije ispravan.'),
  paymentMethod: tripExpensePaymentMethodSchema,
  note: optionalNote,
  fileId: optionalFileId,
});

export type TripExpenseWriteInput = z.input<typeof tripExpenseWriteSchema>;
export type TripExpenseWriteRequest = z.output<typeof tripExpenseWriteSchema>;

export const tripDriverAllowanceSchema = z.object({
  driverId: driverIdSchema,
  perDiemAmount: optionalNonNegative('Dnevnica', 100_000_000_000),
  perDiemCurrency: z.enum(PER_DIEM_CURRENCIES).default('RSD'),
  perDiemStatus: z.enum(PER_DIEM_STATUSES).default('DRAFT'),
  perDiemPaidAmount: optionalNonNegative('Isplaćena dnevnica', 100_000_000_000),
  perDiemPaidAt: optionalIsoDate,
  advanceAmount: optionalNonNegative('Akontacija', 100_000_000_000),
  advanceStatus: z.enum(ADVANCE_STATUSES).default('DRAFT'),
  advancePaidAt: optionalIsoDate,
}).superRefine((value, context) => {
  if (value.perDiemStatus === 'PAID' && (value.perDiemPaidAmount ?? 0) <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['perDiemPaidAmount'],
      message: 'Za isplaćenu dnevnicu unesite stvarno isplaćen iznos u RSD.',
    });
  }

  if (value.perDiemStatus !== 'PAID' && value.perDiemPaidAmount != null) {
    context.addIssue({
      code: 'custom',
      path: ['perDiemPaidAmount'],
      message: 'Isplaćen iznos se unosi tek kada je dnevnica isplaćena.',
    });
  }

  if (value.advanceStatus !== 'DRAFT' && (value.advanceAmount ?? 0) <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['advanceAmount'],
      message: 'Za datu ili razduženu akontaciju unesite iznos.',
    });
  }
});

const odometerKm = (label: string) => optionalNonNegative(label, 100_000_000_000);

/** Odometer readings of one vehicle on the trip. */
export const tripVehicleKmSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vozilo je obavezno.').max(64),
  startKm: odometerKm('Početna kilometraža'),
  endKm: odometerKm('Završna kilometraža'),
});

export type TripVehicleKmInput = z.input<typeof tripVehicleKmSchema>;
export type TripVehicleKmRequest = z.output<typeof tripVehicleKmSchema>;

/** Adds the per-vehicle checks shared by the office settlement and the driver portal. */
export const refineTripVehicleKm = (
  vehicles: ReadonlyArray<TripVehicleKmRequest>,
  ctx: z.RefinementCtx,
  path: ReadonlyArray<string | number>,
): void => {
  const seen = new Set<string>();

  vehicles.forEach((vehicle, index) => {
    if (vehicle.startKm != null && vehicle.endKm != null && vehicle.endKm < vehicle.startKm) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index, 'endKm'],
        message: 'Završna kilometraža ne može biti manja od početne.',
      });
    }

    if (seen.has(vehicle.vehicleId)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index, 'vehicleId'],
        message: 'Isto vozilo je uneto više puta.',
      });
    }

    seen.add(vehicle.vehicleId);
  });
};

export const tripSettlementWriteSchema = z
  .object({
    paidAt: optionalIsoDate,
    carrierId: optionalId,
    startKm: optionalNonNegative('Početna kilometraža', 100_000_000_000),
    endKm: optionalNonNegative('Završna kilometraža', 100_000_000_000),
    fuelLiters: optionalNonNegative('Količina goriva', 10_000),
    /** Per-vehicle readings. When given, they replace `startKm` / `endKm`. */
    vehicleKm: z
      .array(tripVehicleKmSchema)
      .max(MAX_TRIP_VEHICLES, `Najviše ${MAX_TRIP_VEHICLES} vozila po vožnji.`)
      .optional(),
    drivers: z
      .array(tripDriverAllowanceSchema)
      .max(MAX_TRIP_DRIVERS, `Najviše ${MAX_TRIP_DRIVERS} vozača po vožnji.`)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startKm != null && value.endKm != null && value.endKm < value.startKm) {
      ctx.addIssue({
        code: 'custom',
        path: ['endKm'],
        message: 'Završna kilometraža ne može biti manja od početne.',
      });
    }

    refineTripVehicleKm(value.vehicleKm ?? [], ctx, ['vehicleKm']);

    const driverIds = value.drivers?.map((driver) => driver.driverId) ?? [];

    if (new Set(driverIds).size !== driverIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['drivers'],
        message: 'Isti vozač je unet više puta.',
      });
    }
  });

export type TripSettlementWriteInput = z.input<typeof tripSettlementWriteSchema>;
export type TripSettlementWriteRequest = z.output<typeof tripSettlementWriteSchema>;
