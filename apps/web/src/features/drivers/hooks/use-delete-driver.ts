'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteDriver } from '@/features/drivers/api/drivers-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (variables: { id: string; name: string; redirectToList?: boolean }) =>
      deleteDriver(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Vozač je obrisan.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.alarms.all });

      if (variables.redirectToList) {
        router.push('/drivers');
      }
    },
    onError: (error) => {
      toast.error('Vozač nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
