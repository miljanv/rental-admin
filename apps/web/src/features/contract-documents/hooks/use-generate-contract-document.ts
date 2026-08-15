'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { generateContractDocument } from '@/features/contract-documents/api/contract-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useGenerateContractDocument = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateContractDocument(contractId),
    onSuccess: async (result) => {
      toast.success('PDF je generisan.', { description: result.fileName });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.documents(contractId) });
      window.location.assign(result.downloadUrl);
    },
    onError: (error) => {
      toast.error('PDF nije generisan.', { description: getApiErrorMessage(error) });
    },
  });
};
