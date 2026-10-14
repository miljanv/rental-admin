'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteTripCashPayment } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteTripCashPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, paymentId }: { tripId: string; paymentId: string }) =>
      deleteTripCashPayment(tripId, paymentId),
    onSuccess: async () => {
      toast.success('Keš naplata je obrisana.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Keš naplata nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
