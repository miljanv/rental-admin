import { z } from 'zod';

import { isoDateSchema } from './driver';

export const businessAnalyticsQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export type BusinessAnalyticsQueryInput = z.input<typeof businessAnalyticsQuerySchema>;
export type BusinessAnalyticsQueryRequest = z.output<typeof businessAnalyticsQuerySchema>;
