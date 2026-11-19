import { z } from 'zod';

export const paymentCardWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Naziv kartice mora imati najmanje 2 karaktera.')
    .max(60, 'Naziv kartice sme imati najviše 60 karaktera.'),
  isActive: z.boolean().default(true),
});

export type PaymentCardWriteInput = z.input<typeof paymentCardWriteSchema>;
export type PaymentCardWriteRequest = z.output<typeof paymentCardWriteSchema>;

export const paymentCardParamsSchema = z.object({ id: z.string().trim().min(1).max(64) });

export type PaymentCardParams = z.infer<typeof paymentCardParamsSchema>;
