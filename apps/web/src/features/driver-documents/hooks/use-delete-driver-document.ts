'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteDriverDocument } from '@/features/driver-documents/api/driver-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteDriverDocument = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { documentId: string; label: string }) =>
      deleteDriverDocument(driverId, variables.documentId),
    onSuccess: async (_result, variables) => {
      toast.success('Dokument je obrisan.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (error) => {
      toast.error('Dokument nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
