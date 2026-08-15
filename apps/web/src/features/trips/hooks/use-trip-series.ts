'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTripSeries } from '@/features/trips/api/trip-series-api';
import { queryKeys } from '@/lib/query-keys';

export const useTripSeries = (id: string) =>
  useQuery({
    queryKey: queryKeys.trips.series(id),
    queryFn: ({ signal }) => fetchTripSeries(id, signal),
    enabled: id.length > 0,
  });
