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
    onSuccess: async (_trip, variables) => {
      toast.success(
        variables.paymentMethod === 'CASH'
          ? 'Keš vožnja je evidentirana.'
          : 'Faktura je evidentirana.',
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.partners.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      ]);
    },
    onError: (error, variables) => {
      toast.error(
        variables.paymentMethod === 'CASH' ? 'Keš vožnja nije sačuvana.' : 'Faktura nije sačuvana.',
        {
          description: getApiErrorMessage(error),
        },
      );
    },
  });
};
