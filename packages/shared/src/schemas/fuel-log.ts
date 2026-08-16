import { z } from 'zod';

import { FUEL_LOG_FUEL_TYPES } from '../types/fuel-log';
import { isoDateSchema } from './driver';
import {
  optionalCostSchema,
  optionalPaymentMethodSchema,
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

export const fuelLogIdParamsSchema = z.object({
  id: fuelLogIdSchema,
});

export type FuelLogIdParams = z.infer<typeof fuelLogIdParamsSchema>;

const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const optionalLocationSchema = z
  .union([z.string().trim().max(120), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : ''));

const supplierSchema = z
  .string()
  .trim()
  .min(1, 'Dobavljač je obavezan.')
  .max(120, 'Dobavljač sme imati najviše 120 karaktera.');

const litersFilledSchema = z
  .number()
  .positive('Broj litara mora biti veći od nule.')
  .max(2000, 'Broj litara nije ispravan.');

const odometerKmSchema = z
  .number()
  .int('Stanje km mora biti ceo broj.')
  .min(0, 'Stanje km ne može biti negativno.')
  .max(10_000_000, 'Stanje km nije ispravno.');

const fuelLogFieldsSchema = z.object({
  fueledAt: isoDateSchema,
  location: optionalLocationSchema,
  driverId: optionalId,
  fuelType: fuelLogFuelTypeSchema,
  litersFilled: litersFilledSchema,
  odometerKm: odometerKmSchema,
  cost: optionalCostSchema,
  paymentMethod: optionalPaymentMethodSchema,
  supplier: supplierSchema,
  note: optionalText(500),
});

/**
 * `kmDriven` and `consumptionPer100Km` are never part of the write payload —
 * they are always derived server-side from `odometerKm` and the vehicle's
 * previous reading.
 */
export const fuelLogWriteSchema = fuelLogFieldsSchema.superRefine(refineCostRequiresPaymentMethod);

export type FuelLogWriteInput = z.input<typeof fuelLogWriteSchema>;
export type FuelLogWriteRequest = z.output<typeof fuelLogWriteSchema>;

export const fuelLogCreateSchema = fuelLogFieldsSchema
  .extend({ vehicleId: vehicleIdSchema })
  .superRefine(refineCostRequiresPaymentMethod);

export type FuelLogCreateInput = z.input<typeof fuelLogCreateSchema>;
export type FuelLogCreateRequest = z.output<typeof fuelLogCreateSchema>;

const fuelLogBulkRowSchema = z
  .object({
    vehicleId: vehicleIdSchema,
    driverId: optionalId,
    fuelType: fuelLogFuelTypeSchema.optional(),
    litersFilled: litersFilledSchema,
    odometerKm: odometerKmSchema,
    cost: optionalCostSchema,
    paymentMethod: optionalPaymentMethodSchema,
    note: optionalText(500),
  })
  .superRefine(refineCostRequiresPaymentMethod);

export const fuelLogBulkWriteSchema = z.object({
  fueledAt: isoDateSchema,
  supplier: supplierSchema,
  location: optionalLocationSchema,
  fuelType: fuelLogFuelTypeSchema.default('DIESEL'),
  rows: z
    .array(fuelLogBulkRowSchema)
    .min(1, 'Dodajte bar jedno sipanje.')
    .max(50, 'Najviše 50 sipanja u jednom unosu.'),
});

export type FuelLogBulkWriteInput = z.input<typeof fuelLogBulkWriteSchema>;
export type FuelLogBulkWriteRequest = z.output<typeof fuelLogBulkWriteSchema>;

export const FUEL_LOG_SORT_FIELDS = ['fueledAt', 'odometerKm', 'createdAt'] as const;

export type FuelLogSortField = (typeof FUEL_LOG_SORT_FIELDS)[number];

export const listFuelLogsQuerySchema = z.object({
  vehicleId: vehicleIdSchema.optional(),
  supplier: z.string().trim().min(1).max(120).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  fuelType: fuelLogFuelTypeSchema.optional(),
  driverId: z.string().trim().min(1).max(64).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListFuelLogsQuery = z.output<typeof listFuelLogsQuerySchema>;
export type ListFuelLogsQueryInput = z.input<typeof listFuelLogsQuerySchema>;

export const fuelConsumptionQuerySchema = z.object({
  vehicleId: vehicleIdSchema,
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export type FuelConsumptionQuery = z.output<typeof fuelConsumptionQuerySchema>;
export type FuelConsumptionQueryInput = z.input<typeof fuelConsumptionQuerySchema>;
