import { z } from 'zod';
import { isoDateSchema } from './driver';

const id = z.string().trim().min(1).max(64);
const money = z.number().positive('Iznos mora biti pozitivan.').max(100_000_000_000_000).multipleOf(0.01);
export const counterpartySchema = z.object({
  partyType: z.enum(['PARTNER', 'SUPPLIER']),
  partyId: id,
});
export const openingBalanceWriteSchema = counterpartySchema.extend({
  kind: z.enum(['DEBT', 'CREDIT']),
  amount: money,
  asOfDate: isoDateSchema,
  note: z.string().trim().max(2000).default(''),
});
export const openingBalanceConfirmSchema = z.object({
  acknowledgeUnrecordedBalance: z.literal(true, {
    error: 'Potvrdite da stanje nije već evidentirano.',
  }),
});
export const financeReasonSchema = z.object({
  reason: z.string().trim().min(3, 'Unesite razlog (najmanje 3 znaka).').max(1000),
});
export const financeIdParamsSchema = z.object({ id });
export const allocationIdParamsSchema = z.object({ id, allocationId: id });
export const linkCounterpartySchema = counterpartySchema.extend({
  rememberAccount: z.boolean().default(false),
});
export const allocationPlanSchema = z.object({
  ignoreReference: z.boolean().default(false),
});
export const confirmAllocationPlanSchema = allocationPlanSchema.extend({
  token: z.string().regex(/^[a-f0-9]{64}$/),
});
export type CounterpartyRequest = z.infer<typeof counterpartySchema>;
export type OpeningBalanceWriteInput = z.input<typeof openingBalanceWriteSchema>;
export type OpeningBalanceWriteRequest = z.infer<typeof openingBalanceWriteSchema>;
export type LinkCounterpartyRequest = z.infer<typeof linkCounterpartySchema>;
export type AllocationPlanRequest = z.infer<typeof allocationPlanSchema>;
export type ConfirmAllocationPlanRequest = z.infer<typeof confirmAllocationPlanSchema>;
