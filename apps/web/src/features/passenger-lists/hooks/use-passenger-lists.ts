'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPassengerLists } from '@/features/passenger-lists/api/passenger-lists-api';
import { queryKeys } from '@/lib/query-keys';

export const usePassengerLists = (contractId: string) =>
  useQuery({
    queryKey: queryKeys.contracts.passengerLists(contractId),
    queryFn: ({ signal }) => fetchPassengerLists(contractId, signal),
    enabled: contractId.length > 0,
  });
