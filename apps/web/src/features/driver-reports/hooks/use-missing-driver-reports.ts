'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchMissingDriverReports } from '@/features/driver-reports/api/driver-reports-api';
import { queryKeys } from '@/lib/query-keys';

export const useMissingDriverReports = () =>
  useQuery({
    queryKey: queryKeys.driverReports.missing(),
    queryFn: ({ signal }) => fetchMissingDriverReports(signal),
  });
