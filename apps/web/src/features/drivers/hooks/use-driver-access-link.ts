'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverAccessLink } from '@/features/drivers/api/drivers-api';
import { queryKeys } from '@/lib/query-keys';

export const useDriverAccessLink = (driverId: string) =>
  useQuery({
    queryKey: queryKeys.drivers.accessLink(driverId),
    queryFn: ({ signal }) => fetchDriverAccessLink(driverId, signal),
    enabled: driverId.length > 0,
  });
