'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { editTripSeries } from '@/features/trips/api/trip-series-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useEditTripSeries = (seriesId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof editTripSeries>[1]) => editTripSeries(seriesId, body),
    onSuccess: async (result) => {
      toast.success(
        result.priceKeptCount > 0
          ? `Sačuvano za ${result.updatedCount} vožnji. Cena je ostala na ${result.priceKeptCount} već fakturisanih dana.`
          : `Sačuvano za sve dane (${result.updatedCount}).`,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.series(seriesId) });
    },
    onError: (error) => {
      toast.error('Izmena serije nije uspela.', { description: getApiErrorMessage(error) });
    },
  });
};
