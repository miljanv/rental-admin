'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { setPartnerFavorite } from '@/features/partners/api/partners-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useSetPartnerFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; isFavorite: boolean }) =>
      setPartnerFavorite(variables.id, variables.isFavorite),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
    onError: (error) => {
      toast.error('Omiljeni partner nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
