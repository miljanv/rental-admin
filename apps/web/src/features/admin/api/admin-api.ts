import type { AdminSummaryDto, ApiResponse } from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchAdminSummary = async (signal?: AbortSignal): Promise<AdminSummaryDto> => {
  const response = await apiClient.get<ApiResponse<AdminSummaryDto>>('/admin/summary', { signal });

  return unwrap(response.data);
};
