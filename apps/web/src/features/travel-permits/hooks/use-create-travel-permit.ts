'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createTravelPermit } from '@/features/travel-permits/api/travel-permits-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateTravelPermit = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof createTravelPermit>[1]) =>
      createTravelPermit(contractId, body),
    onSuccess: async () => {
      toast.success('Putna dozvola je dodata.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.travelPermits(contractId) });
    },
    onError: (error) => {
      toast.error('Putna dozvola nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
