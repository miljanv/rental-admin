'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteTripExpense } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteTripExpense = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { expenseId: string; label: string }) =>
      deleteTripExpense(tripId, variables.expenseId),
    onSuccess: async (_result, variables) => {
      toast.success('Trošak je obrisan.', { description: variables.label });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Trošak nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
