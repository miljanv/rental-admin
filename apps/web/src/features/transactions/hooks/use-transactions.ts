'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTransactions } from '@/features/transactions/api/transactions-api';
import { queryKeys, type TransactionListQueryParams } from '@/lib/query-keys';

export const useTransactions = (params: TransactionListQueryParams) =>
  useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: ({ signal }) => fetchTransactions(params, signal),
    placeholderData: (previous) => previous,
  });
