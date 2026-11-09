import { z } from 'zod';

import { PAGINATION_DEFAULTS } from '../constants';
import { AUDIT_ACTIONS } from '../types/audit';
import { isoDateSchema } from './driver';

const optionalIdSchema = z.string().trim().min(1).max(64).optional();

export const listAuditEventsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.page),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION_DEFAULTS.maxLimit)
      .default(PAGINATION_DEFAULTS.limit),
    organizationId: optionalIdSchema,
    actorUserId: optionalIdSchema,
    action: z.enum(AUDIT_ACTIONS).optional(),
    /** Inclusive calendar days. */
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'Krajnji datum ne može biti pre početnog.',
  });

export type ListAuditEventsQuery = z.output<typeof listAuditEventsQuerySchema>;
export type ListAuditEventsQueryInput = z.input<typeof listAuditEventsQuerySchema>;
