'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { generateTripSeries } from '@/features/trips/api/trip-series-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useGenerateTripSeries = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: generateTripSeries,
    onSuccess: async (result) => {
      toast.success(`Generisano ${result.generatedCount} vožnji.`, {
        description: result.series.name ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.trips.all });
      router.push(`/trips/series/${result.series.id}`);
    },
    onError: (error) => {
      toast.error('Serija nije generisana.', { description: getApiErrorMessage(error) });
    },
  });
};
