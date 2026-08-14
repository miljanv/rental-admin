'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDrivers } from '@/features/drivers/api/drivers-api';
import { queryKeys, type DriverListQueryParams } from '@/lib/query-keys';

export const useDrivers = (params: DriverListQueryParams) =>
  useQuery({
    queryKey: queryKeys.drivers.list(params),
    queryFn: ({ signal }) => fetchDrivers(params, signal),
    placeholderData: (previous) => previous,
  });
