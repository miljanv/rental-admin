'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchContractDocuments } from '@/features/contract-documents/api/contract-documents-api';
import { queryKeys } from '@/lib/query-keys';

export const useContractDocuments = (contractId: string) =>
  useQuery({
    queryKey: queryKeys.contracts.documents(contractId),
    queryFn: ({ signal }) => fetchContractDocuments(contractId, signal),
    enabled: contractId.length > 0,
  });
