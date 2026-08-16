import { z } from 'zod';

import { FUEL_LOG_FUEL_TYPES } from '../types/fuel-log';
import { isoDateSchema } from './driver';
import {
  optionalCostSchema,
  optionalPaymentMethodSchema,
  optionalSupplierSchema,
  refineCostRequiresPaymentMethod,
} from './transaction';
import { vehicleIdSchema } from './vehicle';

export const fuelLogFuelTypeSchema = z.enum(FUEL_LOG_FUEL_TYPES);

export const fuelLogIdSchema = z.string().trim().min(1).max(64);

export const fuelLogParamsSchema = z.object({
  id: vehicleIdSchema,
  fuelLogId: fuelLogIdSchema,
});

export type FuelLogParams = z.infer<typeof fuelLogParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

/**
 * `kmDriven` and `consumptionPer100Km` are never part of the write payload —
 * they are always derived server-side from `odometerKm` and the vehicle's
 * previous reading.
 */
export const fuelLogWriteSchema = z
  .object({
    fueledAt: isoDateSchema,
    location: requiredText('Mesto točenja', 120),
    driverId: optionalId,
    fuelType: fuelLogFuelTypeSchema,
    litersFilled: z
      .number()
      .positive('Broj litara mora biti veći od nule.')
      .max(2000, 'Broj litara nije ispravan.'),
    odometerKm: z
      .number()
      .int('Stanje km mora biti ceo broj.')
      .min(0, 'Stanje km ne može biti negativno.')
      .max(10_000_000, 'Stanje km nije ispravno.'),
    cost: optionalCostSchema,
    paymentMethod: optionalPaymentMethodSchema,
    supplier: optionalSupplierSchema,
  })
  .superRefine(refineCostRequiresPaymentMethod);

export type FuelLogWriteInput = z.input<typeof fuelLogWriteSchema>;
export type FuelLogWriteRequest = z.output<typeof fuelLogWriteSchema>;

export const FUEL_LOG_SORT_FIELDS = ['fueledAt', 'odometerKm', 'createdAt'] as const;

export type FuelLogSortField = (typeof FUEL_LOG_SORT_FIELDS)[number];

export const listFuelLogsQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  fuelType: fuelLogFuelTypeSchema.optional(),
  driverId: z.string().trim().min(1).max(64).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListFuelLogsQuery = z.output<typeof listFuelLogsQuerySchema>;
export type ListFuelLogsQueryInput = z.input<typeof listFuelLogsQuerySchema>;
