'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPortalTrip } from '@/features/driver-portal/api/driver-portal-api';
import { isDriverLinkInvalid } from '@/features/driver-portal/lib/portal';
import { queryKeys } from '@/lib/query-keys';

export const usePortalTrip = (token: string, tripId: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.trip(token, tripId),
    queryFn: ({ signal }) => fetchPortalTrip(token, tripId, signal),
    retry: (failureCount, error) => !isDriverLinkInvalid(error) && failureCount < 2,
  });
