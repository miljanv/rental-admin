'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverWorkRecords } from '@/features/driver-work/api/driver-work-api';
import { queryKeys, type DriverWorkRecordsQueryParams } from '@/lib/query-keys';

export const useDriverWorkRecords = (driverId: string, params: DriverWorkRecordsQueryParams) =>
  useQuery({
    queryKey: queryKeys.drivers.workRecords(driverId, params),
    queryFn: ({ signal }) => fetchDriverWorkRecords(driverId, params, signal),
    enabled: driverId.length > 0,
    placeholderData: (previous) => previous,
  });
