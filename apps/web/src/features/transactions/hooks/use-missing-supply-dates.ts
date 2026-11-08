'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMissingSupplyDates } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

export const useMissingSupplyDates = () =>
  useQuery({
    queryKey: queryKeys.transactions.missingSupplyDates,
    queryFn: ({ signal }) => fetchMissingSupplyDates(signal),
  });
