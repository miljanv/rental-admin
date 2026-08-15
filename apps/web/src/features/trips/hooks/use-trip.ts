'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTrip } from '@/features/trips/api/trips-api';
import { queryKeys } from '@/lib/query-keys';

export const useTrip = (id: string) =>
  useQuery({
    queryKey: queryKeys.trips.detail(id),
    queryFn: ({ signal }) => fetchTrip(id, signal),
    enabled: id.length > 0,
  });
