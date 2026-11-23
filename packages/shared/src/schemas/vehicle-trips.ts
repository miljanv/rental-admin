import { z } from 'zod';

import { isoDateSchema } from './driver';

export const vehicleTripsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'Datum od mora biti pre datuma do.',
    path: ['to'],
  });

export type VehicleTripsQuery = z.output<typeof vehicleTripsQuerySchema>;
