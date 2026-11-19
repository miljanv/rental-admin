'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPortalTrips } from '@/features/driver-portal/api/driver-portal-api';
import { isDriverLinkInvalid } from '@/features/driver-portal/lib/portal';
import { queryKeys } from '@/lib/query-keys';

export const usePortalTrips = (token: string) =>
  useQuery({
    queryKey: queryKeys.driverPortal.trips(token),
    queryFn: ({ signal }) => fetchPortalTrips(token, signal),
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => !isDriverLinkInvalid(error) && failureCount < 2,
  });
