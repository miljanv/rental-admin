import { z } from 'zod';

import { contractIdSchema } from './contract';
import { isoDateSchema } from './driver';

export const travelPermitIdSchema = z.string().trim().min(1).max(64);

export const travelPermitParamsSchema = z.object({
  id: contractIdSchema,
  permitId: travelPermitIdSchema,
});

export type TravelPermitParams = z.infer<typeof travelPermitParamsSchema>;

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} je obavezno.`)
    .max(max, `${label} sme imati najviše ${max} karaktera.`);

export const travelPermitWriteSchema = z.object({
  country: requiredText('Zemlja', 80),
  permitNumber: requiredText('Broj dozvole', 60),
  issuedAt: isoDateSchema,
  fileId: requiredText('Fajl dozvole', 64),
});

export type TravelPermitWriteInput = z.input<typeof travelPermitWriteSchema>;
export type TravelPermitWriteRequest = z.output<typeof travelPermitWriteSchema>;
