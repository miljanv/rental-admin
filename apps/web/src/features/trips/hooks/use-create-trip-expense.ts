'use client';

import type { TripExpenseWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createTripExpense } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateTripExpense = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TripExpenseWriteRequest) => createTripExpense(tripId, body),
    onSuccess: async () => {
      toast.success('Trošak je dodat.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Trošak nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
