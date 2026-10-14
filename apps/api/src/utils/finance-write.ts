import { prisma, type TransactionClient } from '../config/prisma';

/** Retry concurrent imports/allocations against a fresh, serializable snapshot. */
export const financeWrite = async <T>(work: (tx: TransactionClient) => Promise<T>): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: 'Serializable', timeout: 30_000 });
    } catch (error) {
      if (
        attempt >= 3 ||
        typeof error !== 'object' ||
        error === null ||
        !('code' in error) ||
        error.code !== 'P2034'
      )
        throw error;
    }
  }
};
