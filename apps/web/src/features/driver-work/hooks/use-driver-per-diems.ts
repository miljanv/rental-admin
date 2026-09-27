'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverPerDiems } from '@/features/driver-work/api/driver-per-diem-api';
import { queryKeys, type DriverPerDiemsQueryParams } from '@/lib/query-keys';

export const useDriverPerDiems = (driverId: string, params: DriverPerDiemsQueryParams) =>
  useQuery({
    queryKey: queryKeys.drivers.perDiems(driverId, params),
    queryFn: ({ signal }) => fetchDriverPerDiems(driverId, params, signal),
    enabled: driverId.length > 0,
  });
