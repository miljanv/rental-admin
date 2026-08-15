'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deletePassenger } from '@/features/passenger-lists/api/passenger-lists-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeletePassenger = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { listId: string; passengerId: string }) =>
      deletePassenger(contractId, variables.listId, variables.passengerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.passengerLists(contractId) });
    },
    onError: (error) => {
      toast.error('Putnik nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
