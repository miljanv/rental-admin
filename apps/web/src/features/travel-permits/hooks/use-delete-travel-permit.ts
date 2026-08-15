'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteTravelPermit } from '@/features/travel-permits/api/travel-permits-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteTravelPermit = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permitId: string) => deleteTravelPermit(contractId, permitId),
    onSuccess: async () => {
      toast.success('Putna dozvola je obrisana.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.travelPermits(contractId) });
    },
    onError: (error) => {
      toast.error('Putna dozvola nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
