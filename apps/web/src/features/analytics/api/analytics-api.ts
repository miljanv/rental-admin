import type { ApiResponse, BusinessAnalyticsDto } from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { BusinessAnalyticsParams } from '@/lib/query-keys';

export const fetchBusinessAnalytics = async (
  params: BusinessAnalyticsParams,
  signal?: AbortSignal,
): Promise<BusinessAnalyticsDto> => {
  const response = await apiClient.get<ApiResponse<BusinessAnalyticsDto>>('/analytics/business', {
    params,
    signal,
  });

  return unwrap(response.data);
};
