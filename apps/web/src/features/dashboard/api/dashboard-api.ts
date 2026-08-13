import type { ApiResponse, DashboardStats } from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchDashboardStats = async (signal?: AbortSignal): Promise<DashboardStats> => {
  const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats', { signal });

  return unwrap(response.data);
};
