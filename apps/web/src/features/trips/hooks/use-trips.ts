'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTrips } from '@/features/trips/api/trips-api';
import { queryKeys, type TripListQueryParams } from '@/lib/query-keys';

export const useTrips = (params: TripListQueryParams) =>
  useQuery({
    queryKey: queryKeys.trips.list(params),
    queryFn: ({ signal }) => fetchTrips(params, signal),
    placeholderData: (previous) => previous,
  });
