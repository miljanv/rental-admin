'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchContract } from '@/features/contracts/api/contracts-api';
import { queryKeys } from '@/lib/query-keys';

export const useContract = (id: string) =>
  useQuery({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: ({ signal }) => fetchContract(id, signal),
    enabled: id.length > 0,
  });
