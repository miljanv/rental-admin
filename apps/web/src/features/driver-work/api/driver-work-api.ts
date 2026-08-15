import type { ApiResponse, DriverWorkRecordsDto } from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { DriverWorkRecordsQueryParams } from '@/lib/query-keys';

export const fetchDriverWorkRecords = async (
  driverId: string,
  params: DriverWorkRecordsQueryParams,
  signal?: AbortSignal,
): Promise<DriverWorkRecordsDto> => {
  const response = await apiClient.get<ApiResponse<DriverWorkRecordsDto>>(
    `/drivers/${driverId}/work-records`,
    { params, signal },
  );

  return unwrap(response.data);
};
