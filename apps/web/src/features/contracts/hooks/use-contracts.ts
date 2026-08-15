'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchContracts } from '@/features/contracts/api/contracts-api';
import { queryKeys, type ContractListQueryParams } from '@/lib/query-keys';

export const useContracts = (params: ContractListQueryParams) =>
  useQuery({
    queryKey: queryKeys.contracts.list(params),
    queryFn: ({ signal }) => fetchContracts(params, signal),
    placeholderData: (previous) => previous,
  });
