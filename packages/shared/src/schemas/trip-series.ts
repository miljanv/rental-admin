import { z } from 'zod';

import { TRIP_SERIES_FREQUENCIES } from '../types/trip';
import { driverIdSchema, isoDateSchema } from './driver';
import { optionalPaymentMethodSchema } from './transaction';
import {
  optionalId,
  optionalNonNegative,
  optionalPositiveInt,
  optionalText,
  requiredText,
  tripStatusSchema,
} from './trip';
import { vehicleIdSchema } from './vehicle';

export const tripSeriesFrequencySchema = z.enum(TRIP_SERIES_FREQUENCIES);

export const tripSeriesIdSchema = z.string().trim().min(1, 'Serija je obavezna.').max(64);

export const tripSeriesIdParamsSchema = z.object({ id: tripSeriesIdSchema });

export type TripSeriesIdParams = z.infer<typeof tripSeriesIdParamsSchema>;

const weekdaySchema = z.number().int().min(0).max(6);

/**
 * Creates a TripSeries and generates one Trip (with the same vehicles/drivers)
 * per matching day in [startDate, endDate]. Rotation across instances isn't a
 * generation-time concept — assign the same set here, then adjust individual
 * instances afterward (or use the bulk-update endpoint from a given date).
 */
export const generateTripSeriesSchema = z
  .object({
    name: optionalText(200),
    frequency: tripSeriesFrequencySchema,
    daysOfWeek: z.array(weekdaySchema).max(7).default([]),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    // Assigned per invoiced trip afterward — left blank, every generated
    // instance is created without one.
    referenceNumber: optionalText(60),
    origin: requiredText('Polazište', 150),
    destination: requiredText('Odredište', 150),
    country: optionalText(80),
    passengerCount: optionalPositiveInt('Broj putnika', 500),
    partnerId: optionalId,
    clientName: optionalText(200),
    notes: optionalText(2000),
    price: optionalNonNegative('Cena', 10_000_000),
    paymentMethod: optionalPaymentMethodSchema,
    status: tripStatusSchema.default('PLANNED'),
    contractId: optionalId,
    vehicleIds: z.array(vehicleIdSchema).max(20, 'Najviše 20 vozila po vožnji.').default([]),
    driverIds: z.array(driverIdSchema).max(20, 'Najviše 20 vozača po vožnji.').default([]),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Datum završetka ne može biti pre datuma početka.',
      });
    }

    if (value.frequency === 'WEEKLY' && value.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['daysOfWeek'],
        message: 'Izaberite bar jedan dan u nedelji.',
      });
    }
  });

export type GenerateTripSeriesInput = z.input<typeof generateTripSeriesSchema>;
export type GenerateTripSeriesRequest = z.output<typeof generateTripSeriesSchema>;

/**
 * Applied to every trip in the series with `departureDate >= fromDate`,
 * overwriting the listed fields unconditionally — a field left out of the
 * payload is left untouched on those trips.
 */
export const bulkUpdateTripSeriesSchema = z
  .object({
    fromDate: isoDateSchema,
    vehicleIds: z.array(vehicleIdSchema).max(20, 'Najviše 20 vozila po vožnji.').optional(),
    driverIds: z.array(driverIdSchema).max(20, 'Najviše 20 vozača po vožnji.').optional(),
    status: tripStatusSchema.optional(),
    price: optionalNonNegative('Cena', 10_000_000).optional(),
    paymentMethod: optionalPaymentMethodSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.vehicleIds === undefined &&
      value.driverIds === undefined &&
      value.status === undefined &&
      value.price === undefined &&
      value.paymentMethod === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['fromDate'],
        message: 'Izaberite bar jedno polje za izmenu.',
      });
    }
  });

export type BulkUpdateTripSeriesInput = z.input<typeof bulkUpdateTripSeriesSchema>;
export type BulkUpdateTripSeriesRequest = z.output<typeof bulkUpdateTripSeriesSchema>;

/** Deletes every not-yet-happened trip in the series from `fromDate` onward and deactivates it. */
export const terminateTripSeriesSchema = z.object({
  fromDate: isoDateSchema,
});

export type TerminateTripSeriesRequest = z.output<typeof terminateTripSeriesSchema>;
