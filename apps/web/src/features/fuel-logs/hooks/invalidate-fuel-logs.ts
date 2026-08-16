'use client';

import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

export const invalidateFuelLogQueries = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.fuelLogs.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
  ]);
};
