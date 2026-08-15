'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deletePassengerList } from '@/features/passenger-lists/api/passenger-lists-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeletePassengerList = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => deletePassengerList(contractId, listId),
    onSuccess: async () => {
      toast.success('Spisak je obrisan.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.passengerLists(contractId) });
    },
    onError: (error) => {
      toast.error('Spisak nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
