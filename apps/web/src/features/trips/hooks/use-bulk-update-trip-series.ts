'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { bulkUpdateTripSeries } from '@/features/trips/api/trip-series-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useBulkUpdateTripSeries = (seriesId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof bulkUpdateTripSeries>[1]) =>
      bulkUpdateTripSeries(seriesId, body),
    onSuccess: async (result) => {
      toast.success(`Izmenjeno ${result.updatedCount} vožnji.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.series(seriesId) });
    },
    onError: (error) => {
      toast.error('Izmena serije nije uspela.', { description: getApiErrorMessage(error) });
    },
  });
};
