'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverStatusOverview } from '@/features/drivers/api/drivers-api';
import { queryKeys } from '@/lib/query-keys';

export const useDriverStatusOverview = (driverId: string) =>
  useQuery({
    queryKey: queryKeys.drivers.statusOverview(driverId),
    queryFn: ({ signal }) => fetchDriverStatusOverview(driverId, signal),
    enabled: driverId.length > 0,
  });
