import { z } from 'zod';

import { isoDateSchema } from './driver';
import { SORT_ORDERS } from './file';
import type { PaymentMethod } from '../types/transaction';
import { paymentMethodSchema } from './transaction';
import { vehicleIdSchema } from './vehicle';

export const companyExpenseIdSchema = z.string().trim().min(1).max(64);

export const companyExpenseIdParamsSchema = z.object({ id: companyExpenseIdSchema });

export type CompanyExpenseIdParams = z.infer<typeof companyExpenseIdParamsSchema>;

export const companyExpenseParamsSchema = z.object({
  id: vehicleIdSchema,
  expenseId: companyExpenseIdSchema,
});

export type CompanyExpenseParams = z.infer<typeof companyExpenseParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezan.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const toNullableNumber = (value: unknown): unknown => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return null;
  }

  return value;
};

const optionalOdometerKm = z.preprocess(
  toNullableNumber,
  z
    .number()
    .int('Km mora biti ceo broj.')
    .min(0, 'Km ne može biti negativno.')
    .max(10_000_000, 'Km nije ispravno.')
    .nullable(),
);

const moneyAmount = (label: string, minimum: 'positive' | 'nonnegative') =>
  z.preprocess(
    toNullableNumber,
    (minimum === 'positive'
      ? z.number().positive(`${label} mora biti veći od nule.`)
      : z.number().min(0, `${label} ne može biti negativan.`)
    ).max(10_000_000, `${label} nije ispravan.`),
  );

const requiredPaymentMethod = z
  .union([paymentMethodSchema, z.literal(''), z.null()])
  .optional()
  .superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({
        code: 'custom',
        message: 'Način plaćanja je obavezan.',
      });
    }
  })
  .transform((value): PaymentMethod => value as PaymentMethod);

export const companyExpenseWriteSchema = z
  .object({
    issuedAt: isoDateSchema,
    invoiceNumber: optionalText(80),
    supplier: requiredText('Dobavljač', 120),
    description: requiredText('Opis troška', 500),
    amountWithoutVat: moneyAmount('Iznos bez PDV-a', 'positive'),
    vatAmount: moneyAmount('PDV', 'nonnegative'),
    amountWithVat: moneyAmount('Ukupno sa PDV-om', 'positive'),
    paymentMethod: requiredPaymentMethod,
    vehicleId: optionalId,
    odometerKm: optionalOdometerKm,
  })
  .superRefine((value, ctx) => {
    if (value.vehicleId && value.odometerKm === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['odometerKm'],
        message: 'Km je obavezan za trošak vezan za vozilo.',
      });
    }

    if (!value.vehicleId && value.odometerKm !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['odometerKm'],
        message: 'Km se unosi samo za trošak vezan za vozilo.',
      });
    }
  });

export type CompanyExpenseWriteInput = z.input<typeof companyExpenseWriteSchema>;
export type CompanyExpenseWriteRequest = z.output<typeof companyExpenseWriteSchema>;

export const COMPANY_EXPENSE_SORT_FIELDS = ['issuedAt', 'amount', 'createdAt'] as const;

export type CompanyExpenseSortField = (typeof COMPANY_EXPENSE_SORT_FIELDS)[number];

const companyExpenseQueryBaseSchema = z.object({
  vehicleId: vehicleIdSchema.optional(),
  commonOnly: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value === true || value === 'true';
    }),
  supplier: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
});

const refineCompanyExpenseQuery = (
  value: z.output<typeof companyExpenseQueryBaseSchema>,
  ctx: z.RefinementCtx,
): void => {
  if (value.vehicleId && value.commonOnly) {
    ctx.addIssue({
      code: 'custom',
      path: ['commonOnly'],
      message: 'Filter vozila i zajednički troškovi ne mogu zajedno.',
    });
  }

  if (value.from && value.to && value.from > value.to) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Datum „do“ mora biti isti ili posle datuma „od“.',
    });
  }
};

export const listCompanyExpensesQuerySchema = companyExpenseQueryBaseSchema
  .extend({
    sortBy: z.enum(COMPANY_EXPENSE_SORT_FIELDS).default('issuedAt'),
    sortOrder: z.enum(SORT_ORDERS).default('desc'),
  })
  .superRefine(refineCompanyExpenseQuery);

export type ListCompanyExpensesQuery = z.output<typeof listCompanyExpensesQuerySchema>;
export type ListCompanyExpensesQueryInput = z.input<typeof listCompanyExpensesQuerySchema>;

export const companyExpenseSummaryQuerySchema =
  companyExpenseQueryBaseSchema.superRefine(refineCompanyExpenseQuery);

export type CompanyExpenseSummaryQuery = z.output<typeof companyExpenseSummaryQuerySchema>;
export type CompanyExpenseSummaryQueryInput = z.input<typeof companyExpenseSummaryQuerySchema>;

export type CompanyExpensePaymentMethod = PaymentMethod;
