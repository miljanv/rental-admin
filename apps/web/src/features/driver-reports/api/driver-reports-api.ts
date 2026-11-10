import type {
  AcceptDriverReportRequest,
  ApiPaginatedResponse,
  ApiResponse,
  DriverReportAdminDto,
  PaginationMeta,
  ReturnDriverReportRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { DriverReportListQueryParams } from '@/lib/query-keys';

export interface DriverReportListPage {
  reports: DriverReportAdminDto[];
  pagination: PaginationMeta;
}

export const fetchDriverReports = async (
  params: DriverReportListQueryParams,
  signal?: AbortSignal,
): Promise<DriverReportListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<DriverReportAdminDto>>(
    '/driver-reports',
    { params, signal },
  );

  return { reports: response.data.data, pagination: response.data.pagination };
};

export const acceptDriverReport = async (
  id: string,
  body: AcceptDriverReportRequest,
): Promise<DriverReportAdminDto> => {
  const response = await apiClient.post<ApiResponse<DriverReportAdminDto>>(
    `/driver-reports/${id}/accept`,
    body,
  );

  return unwrap(response.data);
};

export const returnDriverReport = async (
  id: string,
  body: ReturnDriverReportRequest,
): Promise<DriverReportAdminDto> => {
  const response = await apiClient.post<ApiResponse<DriverReportAdminDto>>(
    `/driver-reports/${id}/return`,
    body,
  );

  return unwrap(response.data);
};
