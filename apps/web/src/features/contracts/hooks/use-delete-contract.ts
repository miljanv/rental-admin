'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteContract } from '@/features/contracts/api/contracts-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteContract = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (variables: { id: string; name: string; redirectToList?: boolean }) =>
      deleteContract(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Ugovor je obrisan.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });

      if (variables.redirectToList) {
        router.push('/contracts');
      }
    },
    onError: (error) => {
      toast.error('Ugovor nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
