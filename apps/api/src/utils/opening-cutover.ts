import type { PaymentMethod } from '@rental-admin/shared';
import type { TransactionClient } from '../config/prisma';
import { conflict } from './app-error';

/** Do not count a pre-cutover document/payment on top of its confirmed net opening balance. */
export const assertAfterOpeningCutover = async (
  tx: TransactionClient,
  record: {
    partnerId?: string | null;
    supplierId?: string | null;
    occurredAt: Date;
    paymentMethod?: PaymentMethod | null;
  },
): Promise<void> => {
  if (record.paymentMethod === 'CASH' || (!record.partnerId && !record.supplierId)) return;
  const opening = await tx.openingBalance.findFirst({
    where: {
      status: 'CONFIRMED',
      asOfDate: { gte: record.occurredAt },
      OR: [
        ...(record.partnerId ? [{ partnerId: record.partnerId }] : []),
        ...(record.supplierId ? [{ supplierId: record.supplierId }] : []),
      ],
    },
  });
  if (opening)
    throw conflict(
      'Datum pripada periodu obuhvaćenom potvrđenim početnim stanjem. Prvo uskladite početno stanje da iznos ne bude uračunat dvaput.',
    );
};
