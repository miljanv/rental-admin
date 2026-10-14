'use client';

import type { TripCashPaymentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createTripCashPayment } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateTripCashPayment = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TripCashPaymentWriteRequest) => createTripCashPayment(tripId, body),
    onSuccess: async () => {
      toast.success('Keš naplata je evidentirana.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Keš naplata nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
