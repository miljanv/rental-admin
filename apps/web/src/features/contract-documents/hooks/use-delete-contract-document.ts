'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteContractDocument } from '@/features/contract-documents/api/contract-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteContractDocument = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => deleteContractDocument(contractId, documentId),
    onSuccess: async () => {
      toast.success('Dokument je obrisan.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.documents(contractId) });
    },
    onError: (error) => {
      toast.error('Dokument nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
