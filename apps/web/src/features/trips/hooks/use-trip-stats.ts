'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTripStats } from '@/features/trips/api/trips-api';
import { queryKeys, type TripStatsParams } from '@/lib/query-keys';

export const useTripStats = (params: TripStatsParams) =>
  useQuery({
    queryKey: queryKeys.trips.stats(params),
    queryFn: ({ signal }) => fetchTripStats(params, signal),
    placeholderData: (previous) => previous,
  });
