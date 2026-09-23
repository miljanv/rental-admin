'use client';

import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

export const invalidateCompanyExpenseQueries = async (
  queryClient: QueryClient,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.companyExpenses.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
  ]);
};
