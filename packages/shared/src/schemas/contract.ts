import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import { CONTRACT_STATUSES } from '../types/contract';
import { isoDateSchema } from './driver';
import { SORT_ORDERS } from './file';
import {
  partnerIdSchema,
  partnerTypeSchema,
  pibSchema,
  registrationNumberSchema,
  superRefinePartyIdentity,
} from './partner';

export const contractStatusSchema = z.enum(CONTRACT_STATUSES);

export const contractIdSchema = z.string().trim().min(1).max(64);

export const contractIdParamsSchema = z.object({ id: contractIdSchema });

export type ContractIdParams = z.infer<typeof contractIdParamsSchema>;

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

const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const CLIENT_FIELD_NAMES = {
  companyName: 'clientCompanyName',
  firstName: 'clientFirstName',
  lastName: 'clientLastName',
  pib: 'clientPib',
  registrationNumber: 'clientRegistrationNumber',
  personalId: 'clientPersonalId',
} as const;

export const contractWriteSchema = z
  .object({
    partnerId: partnerIdSchema,
    vehicleId: optionalId,
    driverId: optionalId,
    conclusionDate: isoDateSchema,
    route: requiredText('Relacija', 200),
    serviceStartDate: isoDateSchema,
    serviceEndDate: isoDateSchema,
    passengerCount: z
      .number()
      .int('Broj putnika mora biti ceo broj.')
      .min(1, 'Broj putnika mora biti najmanje 1.')
      .max(200, 'Broj putnika nije ispravan.'),
    price: z.number().min(0, 'Cena ne može biti negativna.').max(10_000_000, 'Cena nije ispravna.'),
    advancePercentage: z
      .number()
      .int('Procenat avansa mora biti ceo broj.')
      .min(0, 'Procenat avansa ne može biti negativan.')
      .max(100, 'Procenat avansa ne može biti veći od 100.'),
    status: contractStatusSchema,
    notes: optionalText(2000),
    isInternational: z.boolean().default(false),
    clientType: partnerTypeSchema,
    clientCompanyName: optionalText(200),
    clientFirstName: optionalText(80),
    clientLastName: optionalText(80),
    clientAddress: requiredText('Adresa naručioca', 200),
    clientPib: pibSchema,
    clientRegistrationNumber: registrationNumberSchema,
    clientPersonalId: optionalText(13),
  })
  .superRefine((value, ctx) => {
    if (value.serviceEndDate < value.serviceStartDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['serviceEndDate'],
        message: 'Datum završetka ne može biti pre datuma početka usluge.',
      });
    }

    superRefinePartyIdentity(
      {
        type: value.clientType,
        companyName: value.clientCompanyName,
        firstName: value.clientFirstName,
        lastName: value.clientLastName,
        pib: value.clientPib,
        registrationNumber: value.clientRegistrationNumber,
        personalId: value.clientPersonalId,
      },
      ctx,
      CLIENT_FIELD_NAMES,
    );
  });

export type ContractWriteInput = z.input<typeof contractWriteSchema>;
export type ContractWriteRequest = z.output<typeof contractWriteSchema>;

export const CONTRACT_SORT_FIELDS = ['conclusionDate', 'serviceStartDate', 'createdAt', 'status'] as const;

export type ContractSortField = (typeof CONTRACT_SORT_FIELDS)[number];

export const listContractsQuerySchema = z.object({
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
  sortBy: z.enum(CONTRACT_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
  status: contractStatusSchema.optional(),
  partnerId: partnerIdSchema.optional(),
  /** Contracts whose [serviceStartDate, serviceEndDate] overlaps this range. */
  periodFrom: isoDateSchema.optional(),
  periodTo: isoDateSchema.optional(),
});

export type ListContractsQuery = z.output<typeof listContractsQuerySchema>;
export type ListContractsQueryInput = z.input<typeof listContractsQuerySchema>;

export const contractStatusChangeSchema = z.object({ status: contractStatusSchema });

export type ContractStatusChangeRequest = z.output<typeof contractStatusChangeSchema>;

export const contractAvailabilityQuerySchema = z
  .object({
    vehicleId: optionalId,
    driverId: optionalId,
    serviceStartDate: isoDateSchema,
    serviceEndDate: isoDateSchema,
    excludeContractId: optionalId,
  })
  .refine((value) => value.serviceEndDate >= value.serviceStartDate, {
    message: 'Datum završetka ne može biti pre datuma početka usluge.',
    path: ['serviceEndDate'],
  });

export type ContractAvailabilityQuery = z.output<typeof contractAvailabilityQuerySchema>;
