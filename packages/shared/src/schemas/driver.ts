import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import { DRIVER_STATUSES, ID_CARD_NUMBER_LENGTH } from '../types/driver';
import { SORT_ORDERS } from './file';

export const driverStatusSchema = z.enum(DRIVER_STATUSES);

export const driverIdSchema = z.string().trim().min(1).max(64);

export const driverIdParamsSchema = z.object({ id: driverIdSchema });

export type DriverIdParams = z.infer<typeof driverIdParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum mora biti u formatu GGGG-MM-DD.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Unesite ispravan datum.');

export const driverWriteSchema = z.object({
  firstName: requiredText('Ime', 80),
  lastName: requiredText('Prezime', 80),
  jmbg: z
    .string()
    .trim()
    .regex(/^\d{13}$/, 'JMBG mora imati tačno 13 cifara.'),
  dateOfBirth: isoDateSchema,
  residencePlace: requiredText('Mesto prebivališta', 120),
  educationLevel: requiredText('Stručna sprema', 80),
  idCardNumber: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${ID_CARD_NUMBER_LENGTH}}$`), `Broj lične karte mora imati tačno ${ID_CARD_NUMBER_LENGTH} cifara.`),
  // No strict format enforced — sources disagree on the exact pattern, so
  // this only guards against obviously-wrong input (empty or absurdly long).
  drivingLicenseNumber: requiredText('Broj vozačke dozvole', 15),
  drivingLicenseCategory: requiredText('Kategorija vozačke dozvole', 40),
  licenseNumber: requiredText('Broj licence', 40),
  phone: requiredText('Telefon', 40),
  email: z
    .string()
    .trim()
    .min(1, 'Email je obavezan.')
    .email('Unesite ispravan email.')
    .max(120, 'Email sme imati najviše 120 karaktera.')
    .transform((value) => value.toLowerCase()),
  jobTitle: requiredText('Radno mesto', 80),
  status: driverStatusSchema,
});

export type DriverWriteInput = z.input<typeof driverWriteSchema>;
export type DriverWriteRequest = z.output<typeof driverWriteSchema>;

export const DRIVER_SORT_FIELDS = ['lastName', 'createdAt', 'status'] as const;

export type DriverSortField = (typeof DRIVER_SORT_FIELDS)[number];

export const listDriversQuerySchema = z.object({
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
  sortBy: z.enum(DRIVER_SORT_FIELDS).default('lastName'),
  sortOrder: z.enum(SORT_ORDERS).default('asc'),
  status: driverStatusSchema.optional(),
});

export type ListDriversQuery = z.output<typeof listDriversQuerySchema>;
export type ListDriversQueryInput = z.input<typeof listDriversQuerySchema>;
