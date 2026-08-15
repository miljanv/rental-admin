'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deletePartner } from '@/features/partners/api/partners-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeletePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; name: string }) => deletePartner(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Partner je obrisan.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
    onError: (error) => {
      toast.error('Partner nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
