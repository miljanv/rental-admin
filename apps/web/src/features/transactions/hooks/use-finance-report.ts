'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFinanceReport } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

export const useFinanceReport = (from: string, to: string) =>
  useQuery({
    queryKey: queryKeys.transactions.reports(from, to),
    queryFn: ({ signal }) => fetchFinanceReport({ from, to }, signal),
    enabled: Boolean(from && to),
  });
