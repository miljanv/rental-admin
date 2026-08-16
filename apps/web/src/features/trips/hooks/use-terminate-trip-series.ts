'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { terminateTripSeries } from '@/features/trips/api/trip-series-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useTerminateTripSeries = (seriesId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof terminateTripSeries>[1]) =>
      terminateTripSeries(seriesId, body),
    onSuccess: async (result) => {
      toast.success(`Serija prekinuta — obrisano ${result.deletedCount} budućih vožnji.`);
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.series(seriesId) });
    },
    onError: (error) => {
      toast.error('Prekid serije nije uspeo.', { description: getApiErrorMessage(error) });
    },
  });
};
