'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchVatReport } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

export const useVatReport = (from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.transactions.vatReport(from, to),
    queryFn: ({ signal }) => fetchVatReport({ from, to }, signal),
    enabled: Boolean(from && to),
  });
