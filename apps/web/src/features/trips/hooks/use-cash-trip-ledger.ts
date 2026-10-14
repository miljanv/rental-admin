'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchCashTripLedger } from '@/features/trips/api/trips-api';
import { queryKeys, type CashTripLedgerQueryParams } from '@/lib/query-keys';

export const useCashTripLedger = (params: CashTripLedgerQueryParams) =>
  useQuery({
    queryKey: queryKeys.trips.cashLedger(params),
    queryFn: ({ signal }) => fetchCashTripLedger(params, signal),
    placeholderData: (previous) => previous,
  });
