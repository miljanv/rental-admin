import { z } from 'zod';

import { VAT_RETURN_KINDS } from '../types/vat-return';
import { isoDateSchema } from './driver';

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

export const vatReturnKindSchema = z.enum(VAT_RETURN_KINDS);

export const vatReturnIdParamsSchema = z.object({ id: z.string().trim().min(1).max(64) });

export const vatReturnWriteSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  kind: vatReturnKindSchema,
  amount: z
    .number({ error: 'Unesite iznos sa prijave.' })
    .positive('Iznos mora biti veći od nule.')
    .max(100_000_000_000, 'Iznos nije ispravan.'),
  documentNumber: optionalText(60),
  filedAt: z
    .union([isoDateSchema, z.literal(''), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  note: optionalText(500),
});

export type VatReturnWriteInput = z.input<typeof vatReturnWriteSchema>;
export type VatReturnWriteRequest = z.output<typeof vatReturnWriteSchema>;
