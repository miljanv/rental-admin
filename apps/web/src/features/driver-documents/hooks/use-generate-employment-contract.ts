'use client';

import type { GenerateEmploymentContractRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { generateEmploymentContract } from '@/features/driver-documents/api/generated-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useGenerateEmploymentContract = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GenerateEmploymentContractRequest) =>
      generateEmploymentContract(driverId, body),
    onSuccess: async (result) => {
      toast.success('Ugovor o radu je generisan.');
      window.location.assign(result.downloadUrl);
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (error) => {
      toast.error('Ugovor nije generisan.', { description: getApiErrorMessage(error) });
    },
  });
};
