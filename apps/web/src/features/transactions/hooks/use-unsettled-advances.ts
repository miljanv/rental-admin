'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchUnsettledAdvances } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

export const useUnsettledAdvances = (supplier?: string) =>
  useQuery({
    queryKey: queryKeys.transactions.unsettledAdvances(supplier),
    queryFn: ({ signal }) => fetchUnsettledAdvances(supplier, signal),
  });
