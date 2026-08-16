import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import { MAX_TRIP_DRIVERS, TRIP_STATUSES } from '../types/trip';
import { driverIdSchema, isoDateSchema } from './driver';
import { SORT_ORDERS } from './file';
import { optionalPaymentMethodSchema, paymentMethodSchema } from './transaction';
import { vehicleIdSchema } from './vehicle';

export const tripStatusSchema = z.enum(TRIP_STATUSES);

export const tripIdSchema = z.string().trim().min(1, 'Vožnja je obavezna.').max(64);

export const tripIdParamsSchema = z.object({ id: tripIdSchema });

export type TripIdParams = z.infer<typeof tripIdParamsSchema>;

export const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

export const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

export const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const optionalIsoDate = z
  .union([isoDateSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const optionalNonNegative = (label: string, max: number) =>
  z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number' && Number.isNaN(value)) {
      return null;
    }

    return value;
  }, z.number().min(0, `${label} ne može biti negativan.`).max(max, `${label} nije ispravan.`).nullable());

export const optionalPositiveInt = (label: string, max: number) =>
  z.preprocess((value) => {
    if (value === '' || value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number' && Number.isNaN(value)) {
      return null;
    }

    return value;
  }, z.number().int(`${label} mora biti ceo broj.`).min(1, `${label} mora biti najmanje 1.`).max(max, `${label} nije ispravan.`).nullable());

export const tripWriteSchema = z
  .object({
    // Assigned once invoicing happens — not a condition for creating a trip.
    referenceNumber: optionalText(60),
    departureDate: isoDateSchema,
    returnDate: optionalIsoDate,
    country: optionalText(80),
    origin: requiredText('Polazište', 150),
    destination: requiredText('Odredište', 150),
    passengerCount: optionalPositiveInt('Broj putnika', 500),
    partnerId: optionalId,
    clientName: optionalText(200),
    notes: optionalText(2000),
    price: optionalNonNegative('Cena', 10_000_000),
    paymentMethod: optionalPaymentMethodSchema,
    status: tripStatusSchema,
    contractId: optionalId,
    distanceKm: optionalNonNegative('Kilometraža', 100_000),
    vehicleIds: z.array(vehicleIdSchema).max(20, 'Najviše 20 vozila po vožnji.').default([]),
    driverIds: z
      .array(driverIdSchema)
      .max(MAX_TRIP_DRIVERS, `Najviše ${MAX_TRIP_DRIVERS} vozača po vožnji.`)
      .default([]),
  })
  .superRefine((value, ctx) => {
    if (value.returnDate && value.returnDate < value.departureDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['returnDate'],
        message: 'Datum povratka ne može biti pre datuma polaska.',
      });
    }
  });

export type TripWriteInput = z.input<typeof tripWriteSchema>;
export type TripWriteRequest = z.output<typeof tripWriteSchema>;

export const TRIP_SORT_FIELDS = ['departureDate', 'createdAt', 'status', 'referenceNumber'] as const;

export type TripSortField = (typeof TRIP_SORT_FIELDS)[number];

export const listTripsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.page),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION_DEFAULTS.maxLimit)
    .default(PAGINATION_DEFAULTS.limit),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: tripStatusSchema.optional(),
  vehicleId: vehicleIdSchema.optional(),
  driverId: driverIdSchema.optional(),
  partnerId: z.string().trim().min(1).max(64).optional(),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  paymentMethod: paymentMethodSchema.optional(),
  seriesId: z.string().trim().min(1).max(64).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  sortBy: z.enum(TRIP_SORT_FIELDS).default('departureDate'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

export type ListTripsQuery = z.output<typeof listTripsQuerySchema>;
export type ListTripsQueryInput = z.input<typeof listTripsQuerySchema>;

export const tripStatsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Datum „do“ mora biti isti ili posle datuma „od“.',
      });
    }
  });

export type TripStatsQueryInput = z.input<typeof tripStatsQuerySchema>;
export type TripStatsQueryRequest = z.output<typeof tripStatsQuerySchema>;
