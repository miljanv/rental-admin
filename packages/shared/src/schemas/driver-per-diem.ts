import { z } from 'zod';

import { isoDateSchema } from './driver';
import { tripIdSchema } from './trip';

export const listDriverPerDiemsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'Datum „od“ mora biti pre datuma „do“.',
    path: ['to'],
  });

export type ListDriverPerDiemsQuery = z.output<typeof listDriverPerDiemsQuerySchema>;
export type ListDriverPerDiemsQueryInput = z.input<typeof listDriverPerDiemsQuerySchema>;

export const listDriverStatisticsQuerySchema = listDriverPerDiemsQuerySchema;
export type ListDriverStatisticsQuery = ListDriverPerDiemsQuery;
export type ListDriverStatisticsQueryInput = ListDriverPerDiemsQueryInput;

const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1, 'Datum i vreme su obavezni.')
  .refine((value) => !Number.isNaN(Date.parse(value.length === 16 ? `${value}:00` : value)), {
    message: 'Datum i vreme nisu ispravni.',
  });

export const borderCrossingSchema = z.object({
  at: isoDateTimeSchema,
  direction: z.enum(['OUT', 'IN']),
});

export const travelTimelineSchema = z
  .object({
    departureAt: isoDateTimeSchema,
    returnAt: isoDateTimeSchema,
    borderCrossings: z.array(borderCrossingSchema).default([]),
  })
  .superRefine((value, context) => {
    const departure = Date.parse(value.departureAt.length === 16 ? `${value.departureAt}:00` : value.departureAt);
    const ret = Date.parse(value.returnAt.length === 16 ? `${value.returnAt}:00` : value.returnAt);

    if (!(departure < ret)) {
      context.addIssue({
        code: 'custom',
        message: 'Vreme povratka mora biti posle vremena polaska.',
        path: ['returnAt'],
      });
    }
  });

export const generateDriverPerDiemDocumentSchema = z.object({
  tripId: tripIdSchema,
  documentNumber: z
    .union([z.string().trim().max(32), z.literal('')])
    .optional()
    .transform((value) => (value ? value : null)),
  timeline: travelTimelineSchema,
  /** Optional override of the advance printed on odluka / nalog (EUR for foreign). */
  advanceAmount: z
    .union([z.number(), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value == null ? null : value))
    .pipe(z.number().min(0).max(1_000_000).nullable()),
});

export type GenerateDriverPerDiemDocumentInput = z.input<typeof generateDriverPerDiemDocumentSchema>;
export type GenerateDriverPerDiemDocumentRequest = z.output<typeof generateDriverPerDiemDocumentSchema>;

export const generateDriverMonthlyPayoutSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export type GenerateDriverMonthlyPayoutInput = z.input<typeof generateDriverMonthlyPayoutSchema>;
export type GenerateDriverMonthlyPayoutRequest = z.output<typeof generateDriverMonthlyPayoutSchema>;

export const DRIVER_PER_DIEM_DOCUMENT_KINDS = [
  'DECISION',
  'ORDER',
  'SETTLEMENT',
  'MONTHLY_PAYOUT',
] as const;

export type DriverPerDiemDocumentKind = (typeof DRIVER_PER_DIEM_DOCUMENT_KINDS)[number];
