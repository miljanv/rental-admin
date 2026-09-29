'use client';

import type { PaymentMethod } from '@rental-admin/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchFinanceReport } from '@/features/transactions/api/transactions-api';
import { queryKeys } from '@/lib/query-keys';

export const useFinanceReport = (from: string, to: string, paymentMethod?: PaymentMethod) =>
  useQuery({
    queryKey: queryKeys.transactions.reports(from, to, paymentMethod),
    queryFn: ({ signal }) => fetchFinanceReport({ from, to, paymentMethod }, signal),
    enabled: Boolean(from && to),
  });
