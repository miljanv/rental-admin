import type { SettlementTargetType } from '@rental-admin/shared';
import { prisma, type TransactionClient } from '../config/prisma';
import { conflict } from './app-error';

export const assertDocumentHasNoAllocations = async (
  targets: Array<{ targetType: SettlementTargetType; targetId: string }>,
  tx: TransactionClient = prisma,
): Promise<void> => {
  if (targets.length && (await tx.paymentAllocation.count({ where: { OR: targets } }))) {
    throw conflict(
      'Dokument je povezan sa uplatom. Prvo poništite povezivanja uz razlog, pa izmenite ili obrišite dokument.',
    );
  }
};
