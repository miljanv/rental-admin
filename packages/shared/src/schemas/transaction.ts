import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import {
  FINANCE_EXPORT_FORMATS,
  PAYMENT_METHODS,
  TRANSACTION_CATEGORIES,
  TRANSACTION_SOURCE_TYPES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type PaymentMethod,
} from '../types/transaction';
import { driverIdSchema, isoDateSchema } from './driver';
import { SORT_ORDERS } from './file';
import { vehicleIdSchema } from './vehicle';

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export const transactionCategorySchema = z.enum(TRANSACTION_CATEGORIES);
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const transactionStatusSchema = z.enum(TRANSACTION_STATUSES);
export const transactionSourceTypeSchema = z.enum(TRANSACTION_SOURCE_TYPES);

export const transactionIdSchema = z.string().trim().min(1).max(64);

export const transactionIdParamsSchema = z.object({ id: transactionIdSchema });

export type TransactionIdParams = z.infer<typeof transactionIdParamsSchema>;

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const optionalId = z
  .union([z.string().trim().min(1).max(64), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const optionalCostSchema = z.preprocess((value) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return null;
  }

  return value;
}, z.number().min(0, 'Iznos ne može biti negativan.').max(10_000_000, 'Iznos nije ispravan.').nullable());

export const optionalPaymentMethodSchema = z
  .union([paymentMethodSchema, z.literal(''), z.null()])
  .optional()
  .transform((value): PaymentMethod | null => (value ? value : null));

export const optionalSupplierSchema = z
  .union([z.string().trim().max(120), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const refineCostRequiresPaymentMethod = (
  value: { cost?: number | null; paymentMethod?: PaymentMethod | null },
  ctx: z.RefinementCtx,
): void => {
  if (value.cost != null && value.cost > 0 && !value.paymentMethod) {
    ctx.addIssue({
      code: 'custom',
      path: ['paymentMethod'],
      message: 'Način plaćanja je obavezan kada je unet iznos.',
    });
  }
};

export const TRANSACTION_SORT_FIELDS = ['occurredAt', 'amount', 'createdAt'] as const;

export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

export const transactionWriteSchema = z
  .object({
    type: transactionTypeSchema,
    category: transactionCategorySchema,
    amount: z
      .number()
      .positive('Iznos mora biti veći od nule.')
      .max(10_000_000, 'Iznos nije ispravan.'),
    occurredAt: isoDateSchema,
    paymentMethod: paymentMethodSchema,
    note: optionalText(500),
    supplier: optionalSupplierSchema,
    partner: optionalSupplierSchema,
    route: optionalSupplierSchema,
    vehicleId: optionalId,
    driverId: optionalId,
    contractId: optionalId,
    isAdvance: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.isAdvance && value.type !== 'EXPENSE') {
      ctx.addIssue({
        code: 'custom',
        path: ['type'],
        message: 'Avans se knjiži kao rashod (uplata dobavljaču).',
      });
    }

    if (value.isAdvance && !value.supplier) {
      ctx.addIssue({
        code: 'custom',
        path: ['supplier'],
        message: 'Dobavljač je obavezan za avansnu uplatu.',
      });
    }
  });

export type TransactionWriteInput = z.input<typeof transactionWriteSchema>;
export type TransactionWriteRequest = z.output<typeof transactionWriteSchema>;

export const listTransactionsQuerySchema = z.object({
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
  type: transactionTypeSchema.optional(),
  category: transactionCategorySchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  status: transactionStatusSchema.optional(),
  isAdvance: z
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
  vehicleId: vehicleIdSchema.optional(),
  driverId: driverIdSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  sortBy: z.enum(TRANSACTION_SORT_FIELDS).default('occurredAt'),
  sortOrder: z.enum(SORT_ORDERS).default('desc'),
});

export type ListTransactionsQuery = z.output<typeof listTransactionsQuerySchema>;
export type ListTransactionsQueryInput = z.input<typeof listTransactionsQuerySchema>;

export const unsettledAdvancesQuerySchema = z.object({
  supplier: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type UnsettledAdvancesQuery = z.output<typeof unsettledAdvancesQuerySchema>;
export type UnsettledAdvancesQueryInput = z.input<typeof unsettledAdvancesQuerySchema>;

export const settleAdvancesSchema = z
  .object({
    supplier: z
      .string()
      .trim()
      .min(1, 'Dobavljač je obavezan.')
      .max(120, 'Dobavljač sme imati najviše 120 karaktera.'),
    occurredAt: isoDateSchema,
    paymentMethod: paymentMethodSchema,
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    advanceIds: z.array(transactionIdSchema).min(1).max(200).optional(),
    amount: z
      .number()
      .positive('Iznos mora biti veći od nule.')
      .max(10_000_000, 'Iznos nije ispravan.')
      .optional(),
    note: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Datum „do“ mora biti isti ili posle datuma „od“.',
      });
    }
  });

export type SettleAdvancesInput = z.input<typeof settleAdvancesSchema>;
export type SettleAdvancesRequest = z.output<typeof settleAdvancesSchema>;

export const financeReportQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Datum „do“ mora biti isti ili posle datuma „od“.',
      });
    }
  });

export type FinanceReportQueryInput = z.input<typeof financeReportQuerySchema>;
export type FinanceReportQueryRequest = z.output<typeof financeReportQuerySchema>;

export const financeExportQuerySchema = listTransactionsQuerySchema
  .omit({ page: true, limit: true, sortBy: true, sortOrder: true })
  .extend({
    format: z.enum(FINANCE_EXPORT_FORMATS),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Datum „do“ mora biti isti ili posle datuma „od“.',
      });
    }
  });

export type FinanceExportQueryInput = z.input<typeof financeExportQuerySchema>;
export type FinanceExportQueryRequest = z.output<typeof financeExportQuerySchema>;
