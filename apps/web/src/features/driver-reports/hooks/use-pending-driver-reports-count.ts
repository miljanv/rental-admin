'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchPendingDriverReportsCount } from '@/features/driver-reports/api/driver-reports-api';
import { queryKeys } from '@/lib/query-keys';

/** Reports waiting for the office; polled so the menu badge stays current. */
export const usePendingDriverReportsCount = () =>
  useQuery({
    queryKey: queryKeys.driverReports.pendingCount(),
    queryFn: ({ signal }) => fetchPendingDriverReportsCount(signal),
    refetchInterval: 60_000,
    retry: false,
  });
