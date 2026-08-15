import { z } from 'zod';

import { isoDateSchema } from './driver';

export const listDriverWorkRecordsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'Datum „od“ mora biti pre datuma „do“.',
    path: ['to'],
  });

export type ListDriverWorkRecordsQuery = z.output<typeof listDriverWorkRecordsQuerySchema>;
export type ListDriverWorkRecordsQueryInput = z.input<typeof listDriverWorkRecordsQuerySchema>;
