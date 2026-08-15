'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createPassengerList } from '@/features/passenger-lists/api/passenger-lists-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreatePassengerList = (contractId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof createPassengerList>[1]) =>
      createPassengerList(contractId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.passengerLists(contractId) });
    },
    onError: (error) => {
      toast.error('Spisak nije kreiran.', { description: getApiErrorMessage(error) });
    },
  });
};
