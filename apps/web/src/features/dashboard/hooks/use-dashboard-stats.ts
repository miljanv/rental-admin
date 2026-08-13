'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchDashboardStats } from '@/features/dashboard/api/dashboard-api';
import { queryKeys } from '@/lib/query-keys';

export const useDashboardStats = () =>
  useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: ({ signal }) => fetchDashboardStats(signal),
  });
