import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import { JMBG_LENGTH, PARTNER_TYPES, PIB_LENGTH, REGISTRATION_NUMBER_LENGTH } from '../types/partner';
import { SORT_ORDERS } from './file';

export const partnerTypeSchema = z.enum(PARTNER_TYPES);

export const partnerIdSchema = z.string().trim().min(1, 'Partner je obavezan.').max(64);

export const partnerIdParamsSchema = z.object({ id: partnerIdSchema });

export type PartnerIdParams = z.infer<typeof partnerIdParamsSchema>;

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

/** Empty stays optional (→ null); a non-empty value must be exactly `length` digits. */
const optionalDigits = (label: string, length: number) =>
  z
    .union([z.string().trim(), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || new RegExp(`^\\d{${length}}$`).test(value), {
      message: `${label} mora imati tačno ${length} cifara.`,
    });

/** Shared by `partnerWriteSchema` and `contractWriteSchema`'s client-* fields — same PIB/MB/JMBG format everywhere. */
export const pibSchema = optionalDigits('PIB', PIB_LENGTH);
export const registrationNumberSchema = optionalDigits('Matični broj', REGISTRATION_NUMBER_LENGTH);
export const jmbgSchema = optionalDigits('JMBG', JMBG_LENGTH);

/**
 * Shared by `partnerWriteSchema` and `contractWriteSchema` (whose client-*
 * fields mirror these exact rules under different names): a legal entity
 * needs company name + PIB + matični broj; an individual needs first/last
 * name + JMBG, and must not carry the legal-entity fields.
 */
export const superRefinePartyIdentity = (
  value: {
    type: (typeof PARTNER_TYPES)[number];
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    pib: string | null;
    registrationNumber: string | null;
    personalId: string | null;
  },
  ctx: z.RefinementCtx,
  fieldNames: {
    companyName: string;
    firstName: string;
    lastName: string;
    pib: string;
    registrationNumber: string;
    personalId: string;
  },
): void => {
  if (value.type === 'INDIVIDUAL') {
    if (!value.firstName) {
      ctx.addIssue({ code: 'custom', path: [fieldNames.firstName], message: 'Ime je obavezno za fizičko lice.' });
    }
    if (!value.lastName) {
      ctx.addIssue({ code: 'custom', path: [fieldNames.lastName], message: 'Prezime je obavezno za fizičko lice.' });
    }
    if (!value.personalId) {
      ctx.addIssue({ code: 'custom', path: [fieldNames.personalId], message: 'JMBG je obavezan za fizičko lice.' });
    }
    if (value.companyName) {
      ctx.addIssue({ code: 'custom', path: [fieldNames.companyName], message: 'Naziv firme ne važi za fizičko lice.' });
    }
    if (value.pib) {
      ctx.addIssue({ code: 'custom', path: [fieldNames.pib], message: 'PIB ne važi za fizičko lice.' });
    }
    if (value.registrationNumber) {
      ctx.addIssue({
        code: 'custom',
        path: [fieldNames.registrationNumber],
        message: 'Matični broj ne važi za fizičko lice.',
      });
    }
    return;
  }

  if (!value.companyName) {
    ctx.addIssue({ code: 'custom', path: [fieldNames.companyName], message: 'Naziv je obavezan.' });
  }
  if (!value.pib) {
    ctx.addIssue({ code: 'custom', path: [fieldNames.pib], message: 'PIB je obavezan.' });
  }
  if (!value.registrationNumber) {
    ctx.addIssue({ code: 'custom', path: [fieldNames.registrationNumber], message: 'Matični broj je obavezan.' });
  }
  if (value.firstName) {
    ctx.addIssue({ code: 'custom', path: [fieldNames.firstName], message: 'Ime važi samo za fizičko lice.' });
  }
  if (value.lastName) {
    ctx.addIssue({ code: 'custom', path: [fieldNames.lastName], message: 'Prezime važi samo za fizičko lice.' });
  }
  if (value.personalId) {
    ctx.addIssue({ code: 'custom', path: [fieldNames.personalId], message: 'JMBG važi samo za fizičko lice.' });
  }
};

const PARTY_FIELD_NAMES = {
  companyName: 'companyName',
  firstName: 'firstName',
  lastName: 'lastName',
  pib: 'pib',
  registrationNumber: 'registrationNumber',
  personalId: 'personalId',
} as const;

export const partnerWriteSchema = z
  .object({
    type: partnerTypeSchema,
    companyName: optionalText(200),
    firstName: optionalText(80),
    lastName: optionalText(80),
    address: requiredText('Adresa', 200),
    city: requiredText('Mesto', 120),
    nickname: optionalText(120),
    pib: pibSchema,
    registrationNumber: registrationNumberSchema,
    personalId: jmbgSchema,
  })
  .superRefine((value, ctx) => superRefinePartyIdentity(value, ctx, PARTY_FIELD_NAMES));

export type PartnerWriteInput = z.input<typeof partnerWriteSchema>;
export type PartnerWriteRequest = z.output<typeof partnerWriteSchema>;

export const PARTNER_SORT_FIELDS = ['createdAt', 'type'] as const;

export type PartnerSortField = (typeof PARTNER_SORT_FIELDS)[number];

export const listPartnersQuerySchema = z.object({
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
  sortBy: z.enum(PARTNER_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
  type: partnerTypeSchema.optional(),
});

export type ListPartnersQuery = z.output<typeof listPartnersQuerySchema>;
export type ListPartnersQueryInput = z.input<typeof listPartnersQuerySchema>;
