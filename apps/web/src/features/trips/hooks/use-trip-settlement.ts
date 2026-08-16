'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTripSettlement } from '@/features/trips/api/trips-api';
import { queryKeys } from '@/lib/query-keys';

export const useTripSettlement = (tripId: string) =>
  useQuery({
    queryKey: queryKeys.trips.settlement(tripId),
    queryFn: ({ signal }) => fetchTripSettlement(tripId, signal),
    enabled: tripId.length > 0,
  });
