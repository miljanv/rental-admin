'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { addPassenger } from '@/features/passenger-lists/api/passenger-lists-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useAddPassenger = (contractId: string, listId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof addPassenger>[2]) => addPassenger(contractId, listId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.passengerLists(contractId) });
    },
    onError: (error) => {
      toast.error('Putnik nije dodat.', { description: getApiErrorMessage(error) });
    },
  });
};
