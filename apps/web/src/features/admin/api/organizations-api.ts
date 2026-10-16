import type {
  ApiResponse,
  DeleteOrganizationResult,
  OrganizationDto,
  OrganizationWriteRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchOrganizations = async (signal?: AbortSignal): Promise<OrganizationDto[]> => {
  const response = await apiClient.get<ApiResponse<OrganizationDto[]>>('/organizations', {
    signal,
  });

  return unwrap(response.data);
};

export const createOrganization = async (
  body: OrganizationWriteRequest,
): Promise<OrganizationDto> => {
  const response = await apiClient.post<ApiResponse<OrganizationDto>>('/organizations', body);

  return unwrap(response.data);
};

export const updateOrganization = async (
  id: string,
  body: OrganizationWriteRequest,
): Promise<OrganizationDto> => {
  const response = await apiClient.patch<ApiResponse<OrganizationDto>>(
    `/organizations/${id}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteOrganization = async (id: string): Promise<DeleteOrganizationResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteOrganizationResult>>(
    `/organizations/${id}`,
  );

  return unwrap(response.data);
};
