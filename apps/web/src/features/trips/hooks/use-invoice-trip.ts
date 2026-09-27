'use client';

import type { TripInvoiceWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { invoiceTrip } from '@/features/trips/api/trips-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useInvoiceTrip = (tripId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TripInvoiceWriteRequest) => invoiceTrip(tripId, body),
    onSuccess: async () => {
      toast.success('Faktura je evidentirana.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Faktura nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
