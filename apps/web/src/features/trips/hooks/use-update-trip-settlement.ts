'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateTripSettlement } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateTripSettlement = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof updateTripSettlement>[1]) =>
      updateTripSettlement(tripId, body),
    onSuccess: async () => {
      toast.success('Obračun je sačuvan.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
    },
    onError: (error) => {
      toast.error('Obračun nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
