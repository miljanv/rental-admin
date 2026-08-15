'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTravelPermits } from '@/features/travel-permits/api/travel-permits-api';
import { queryKeys } from '@/lib/query-keys';

export const useTravelPermits = (contractId: string) =>
  useQuery({
    queryKey: queryKeys.contracts.travelPermits(contractId),
    queryFn: ({ signal }) => fetchTravelPermits(contractId, signal),
    enabled: contractId.length > 0,
  });
