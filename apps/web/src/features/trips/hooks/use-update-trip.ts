'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateTrip } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateTrip = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Parameters<typeof updateTrip>[1]) => updateTrip(id, body),
    onSuccess: async (trip) => {
      toast.success('Izmene su sačuvane.', { description: trip.route });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      router.push(`/trips/${trip.id}`);
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
