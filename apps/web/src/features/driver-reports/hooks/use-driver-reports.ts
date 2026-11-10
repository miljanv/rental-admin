'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDriverReports } from '@/features/driver-reports/api/driver-reports-api';
import { queryKeys, type DriverReportListQueryParams } from '@/lib/query-keys';

export const useDriverReports = (params: DriverReportListQueryParams) =>
  useQuery({
    queryKey: queryKeys.driverReports.list(params),
    queryFn: ({ signal }) => fetchDriverReports(params, signal),
    placeholderData: (previous) => previous,
  });
