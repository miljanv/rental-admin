'use client';

import { tripRouteLabel } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createTrip } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateTrip = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createTrip,
    onSuccess: async (trip) => {
      toast.success('Vožnja je kreirana.', { description: tripRouteLabel(trip) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      router.push(`/trips/${trip.id}`);
    },
    onError: (error) => {
      toast.error('Vožnja nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
