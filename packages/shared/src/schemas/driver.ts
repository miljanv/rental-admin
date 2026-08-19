import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import {
  DRIVER_STATUSES,
  EMPLOYMENT_TYPES,
  ID_CARD_NUMBER_LENGTH,
  JOB_TITLE_MAX_LENGTH,
} from '../types/driver';
import { SORT_ORDERS } from './file';

export const driverStatusSchema = z.enum(DRIVER_STATUSES);
export const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);

export const driverIdSchema = z.string().trim().min(1).max(64);

export const driverIdParamsSchema = z.object({ id: driverIdSchema });

export type DriverIdParams = z.infer<typeof driverIdParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum mora biti u formatu dd.mm.gggg.')
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
  // Optional — not every driver's street address is on hand yet, but once
  // saved it auto-fills the Ugovor o radu / Obrazac MA generators.
  residenceAddress: optionalText(160),
  educationLevel: requiredText('Stručna sprema', 80),
  idCardNumber: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${ID_CARD_NUMBER_LENGTH}}$`),
      `Broj lične karte mora imati tačno ${ID_CARD_NUMBER_LENGTH} cifara.`,
    ),
  // No strict format enforced — sources disagree on the exact pattern, so
  // this only guards against obviously-wrong input (empty or absurdly long).
  drivingLicenseNumber: requiredText('Broj vozačke dozvole', 15),
  // Stored as one comma-separated string (e.g. "B, C, CE"). 120 covers every
  // known category selected at once with room to spare — see driver.ts types.
  drivingLicenseCategory: requiredText('Kategorija vozačke dozvole', 120),
  licenseNumber: requiredText('Broj licence', 40),
  phone: requiredText('Telefon', 40),
  // Optional — most drivers don't have or use one. Format is only enforced
  // when something is actually entered.
  email: z
    .union([
      z
        .string()
        .trim()
        .max(120, 'Email sme imati najviše 120 karaktera.')
        .email('Unesite ispravan email.')
        .transform((value) => value.toLowerCase()),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((value) => (value ? value : null)),
  // Stored as one comma-separated string (e.g. two driver posts at once).
  jobTitle: requiredText('Radno mesto', JOB_TITLE_MAX_LENGTH),
  status: driverStatusSchema,
  employmentType: employmentTypeSchema,
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
