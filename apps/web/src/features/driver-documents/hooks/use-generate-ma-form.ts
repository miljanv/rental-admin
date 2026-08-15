'use client';

import type { GenerateMaFormRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { generateMaForm } from '@/features/driver-documents/api/generated-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useGenerateMaForm = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GenerateMaFormRequest) => generateMaForm(driverId, body),
    onSuccess: async (result) => {
      toast.success('Obrazac MA je generisan.');
      window.location.assign(result.downloadUrl);
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.alarms.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (error) => {
      toast.error('Obrazac MA nije generisan.', { description: getApiErrorMessage(error) });
    },
  });
};
