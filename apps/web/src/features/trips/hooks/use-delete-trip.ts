'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteTrip } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (variables: { id: string; name: string; redirectToList?: boolean }) =>
      deleteTrip(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Vožnja je obrisana.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });

      if (variables.redirectToList) {
        router.push('/trips');
      }
    },
    onError: (error) => {
      toast.error('Vožnja nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
