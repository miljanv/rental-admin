'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deleteVehicle } from '@/features/vehicles/api/vehicles-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (variables: { id: string; name: string; redirectToList?: boolean }) =>
      deleteVehicle(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Vozilo je obrisano.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });

      if (variables.redirectToList) {
        router.push('/vehicles');
      }
    },
    onError: (error) => {
      toast.error('Vozilo nije obrisano.', { description: getApiErrorMessage(error) });
    },
  });
};
