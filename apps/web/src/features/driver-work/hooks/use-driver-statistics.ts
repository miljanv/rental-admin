'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverStatistics } from '@/features/driver-work/api/driver-per-diem-api';
import { queryKeys, type DriverStatisticsQueryParams } from '@/lib/query-keys';

export const useDriverStatistics = (driverId: string, params: DriverStatisticsQueryParams) =>
  useQuery({
    queryKey: queryKeys.drivers.statistics(driverId, params),
    queryFn: ({ signal }) => fetchDriverStatistics(driverId, params, signal),
    enabled: driverId.length > 0,
  });
