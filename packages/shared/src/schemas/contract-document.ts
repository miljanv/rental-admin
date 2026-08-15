import { z } from 'zod';

import { contractIdSchema } from './contract';

export const contractDocumentIdSchema = z.string().trim().min(1).max(64);

export const contractDocumentParamsSchema = z.object({
  id: contractIdSchema,
  documentId: contractDocumentIdSchema,
});

export type ContractDocumentParams = z.infer<typeof contractDocumentParamsSchema>;
