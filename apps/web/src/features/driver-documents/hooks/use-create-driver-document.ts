'use client';

import type { DriverDocumentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createDriverDocument } from '@/features/driver-documents/api/driver-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateDriverDocument = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: DriverDocumentWriteRequest) => createDriverDocument(driverId, body),
    onSuccess: async () => {
      toast.success('Dokument je dodat.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.alarms.all });
    },
    onError: (error) => {
      toast.error('Dokument nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
