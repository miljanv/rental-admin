'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchOpenItemsTotals } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

/** Totals of all open invoices and bills, computed on the API with no row limit. */
export const useOpenItemsTotals = () =>
  useQuery({
    queryKey: queryKeys.transactions.openItems,
    queryFn: ({ signal }) => fetchOpenItemsTotals(signal),
  });
