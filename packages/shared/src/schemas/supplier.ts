import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import { PIB_LENGTH, REGISTRATION_NUMBER_LENGTH } from '../types/partner';
import { SUPPLIER_SORT_FIELDS } from '../types/supplier';
import { SORT_ORDERS } from './file';

export const supplierIdSchema = z.string().trim().min(1, 'Dobavljač je obavezan.').max(64);

export const supplierIdParamsSchema = z.object({ id: supplierIdSchema });

export type SupplierIdParams = z.infer<typeof supplierIdParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezan.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const optionalEmail = z
  .union([z.string().trim().email('Email nije ispravan.').max(160), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalDigits = (label: string, length: number) =>
  z
    .union([z.string().trim(), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || new RegExp(`^\\d{${length}}$`).test(value), {
      message: `${label} mora imati tačno ${length} cifara.`,
    });

export const supplierWriteSchema = z.object({
  name: requiredText('Naziv dobavljača', 200),
  email: optionalEmail,
  phone: optionalText(80),
  pib: optionalDigits('PIB', PIB_LENGTH),
  registrationNumber: optionalDigits('Matični broj', REGISTRATION_NUMBER_LENGTH),
  address: optionalText(200),
  city: optionalText(120),
  contactPerson: optionalText(120),
  note: optionalText(500),
});

export type SupplierWriteInput = z.input<typeof supplierWriteSchema>;
export type SupplierWriteRequest = z.output<typeof supplierWriteSchema>;

export const listSuppliersQuerySchema = z.object({
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
  sortBy: z.enum(SUPPLIER_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

export type ListSuppliersQuery = z.output<typeof listSuppliersQuerySchema>;
export type ListSuppliersQueryInput = z.input<typeof listSuppliersQuerySchema>;
