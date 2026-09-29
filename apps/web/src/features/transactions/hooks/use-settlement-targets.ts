'use client';

import type { TransactionDto } from '@rental-admin/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchSettlementTargets } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

export const useSettlementTargets = (
  params: {
    transactionId?: string;
    type?: TransactionDto['type'];
    search?: string;
    limit?: number;
  },
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.transactions.settlementTargets(params),
    queryFn: ({ signal }) => fetchSettlementTargets(params, signal),
    enabled,
  });
