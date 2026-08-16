'use client';

import type { TripExpenseWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateTripExpense } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateTripExpense = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { expenseId: string; body: TripExpenseWriteRequest }) =>
      updateTripExpense(tripId, variables.expenseId, variables.body),
    onSuccess: async () => {
      toast.success('Trošak je izmenjen.');
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
