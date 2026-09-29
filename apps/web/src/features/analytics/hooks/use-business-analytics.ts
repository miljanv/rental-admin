'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchBusinessAnalytics } from '@/features/analytics/api/analytics-api';
import { queryKeys, type BusinessAnalyticsParams } from '@/lib/query-keys';

export const useBusinessAnalytics = (params: BusinessAnalyticsParams) =>
  useQuery({
    queryKey: queryKeys.analytics.business(params),
    queryFn: ({ signal }) => fetchBusinessAnalytics(params, signal),
    placeholderData: (previous) => previous,
  });
