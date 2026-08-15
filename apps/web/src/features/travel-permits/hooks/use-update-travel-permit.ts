'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateTravelPermit } from '@/features/travel-permits/api/travel-permits-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateTravelPermit = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { permitId: string; body: Parameters<typeof updateTravelPermit>[2] }) =>
      updateTravelPermit(contractId, variables.permitId, variables.body),
    onSuccess: async () => {
      toast.success('Izmene su sačuvane.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.travelPermits(contractId) });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
