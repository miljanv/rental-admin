'use client';

import type { DriverDocumentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateDriverDocument } from '@/features/driver-documents/api/driver-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateDriverDocument = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { documentId: string; body: DriverDocumentWriteRequest }) =>
      updateDriverDocument(driverId, variables.documentId, variables.body),
    onSuccess: async () => {
      toast.success('Dokument je izmenjen.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
