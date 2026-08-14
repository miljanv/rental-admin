import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import {
  TACHOGRAPH_TYPES,
  VEHICLE_FUEL_TYPES,
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
} from '../types/vehicle';
import { SORT_ORDERS } from './file';

export const vehicleTypeSchema = z.enum(VEHICLE_TYPES);
export const vehicleFuelTypeSchema = z.enum(VEHICLE_FUEL_TYPES);
export const tachographTypeSchema = z.enum(TACHOGRAPH_TYPES);
export const vehicleStatusSchema = z.enum(VEHICLE_STATUSES);

export const vehicleIdSchema = z.string().trim().min(1).max(64);

export const vehicleIdParamsSchema = z.object({ id: vehicleIdSchema });

export type VehicleIdParams = z.infer<typeof vehicleIdParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

export const vehicleWriteSchema = z.object({
  make: requiredText('Marka', 60),
  model: requiredText('Model', 60),
  year: z
    .number()
    .int('Godište mora biti ceo broj.')
    .min(1980, 'Godište mora biti 1980 ili kasnije.')
    .max(2100, 'Godište nije ispravno.'),
  licensePlate: requiredText('Registarske tablice', 20),
  vin: z
    .string()
    .trim()
    .min(5, 'VIN mora imati bar 5 karaktera.')
    .max(32, 'VIN sme imati najviše 32 karaktera.')
    .transform((value) => value.toUpperCase()),
  seatCount: z
    .number()
    .int('Broj sedišta mora biti ceo broj.')
    .min(1, 'Broj sedišta mora biti najmanje 1.')
    .max(100, 'Broj sedišta sme biti najviše 100.'),
  type: vehicleTypeSchema,
  fuelType: vehicleFuelTypeSchema,
  tachographType: tachographTypeSchema,
  status: vehicleStatusSchema,
  currentMileage: z
    .number()
    .int('Kilometraža mora biti ceo broj.')
    .min(0, 'Kilometraža ne može biti negativna.')
    .max(10_000_000, 'Kilometraža nije ispravna.'),
});

export type VehicleWriteInput = z.input<typeof vehicleWriteSchema>;
export type VehicleWriteRequest = z.output<typeof vehicleWriteSchema>;

export const VEHICLE_SORT_FIELDS = [
  'make',
  'licensePlate',
  'year',
  'currentMileage',
  'createdAt',
  'status',
] as const;

export type VehicleSortField = (typeof VEHICLE_SORT_FIELDS)[number];

export const listVehiclesQuerySchema = z.object({
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
  sortBy: z.enum(VEHICLE_SORT_FIELDS).default('make'),
  sortOrder: z.enum(SORT_ORDERS).default('asc'),
  status: vehicleStatusSchema.optional(),
  type: vehicleTypeSchema.optional(),
});

export type ListVehiclesQuery = z.output<typeof listVehiclesQuerySchema>;
export type ListVehiclesQueryInput = z.input<typeof listVehiclesQuerySchema>;
