import {
  ORGANIZATION_HEADER,
  PAGINATION_DEFAULTS,
  type ApiPaginatedResponse,
  type ApiResponse,
  type DeleteOrganizationResult,
  type OrganizationDto,
  type OrganizationOverviewDto,
  type OrganizationProfileRequest,
  type OrganizationWriteRequest,
  type VehicleDto,
} from '@rental-admin/shared';

import type { VehicleListPage } from '@/features/vehicles/api/vehicles-api';
import { apiClient, unwrap } from '@/lib/api-client';

/** Works in the given organization for this one request, whichever is chosen in the header. */
const inOrganization = (organizationId: string) => ({
  headers: { [ORGANIZATION_HEADER]: organizationId },
});

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

export const fetchOrganizationOverview = async (
  id: string,
  signal?: AbortSignal,
): Promise<OrganizationOverviewDto> => {
  const response = await apiClient.get<ApiResponse<OrganizationOverviewDto>>(
    `/organizations/${id}/overview`,
    { signal },
  );

  return unwrap(response.data);
};

export const updateOrganizationProfile = async (
  id: string,
  body: OrganizationProfileRequest,
): Promise<OrganizationDto> => {
  const response = await apiClient.patch<ApiResponse<OrganizationDto>>(
    `/organizations/${id}/profile`,
    body,
  );

  return unwrap(response.data);
};

export const fetchOrganizationVehicles = async (
  organizationId: string,
  page: number,
  signal?: AbortSignal,
): Promise<VehicleListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<VehicleDto>>('/vehicles', {
    ...inOrganization(organizationId),
    params: { page, limit: PAGINATION_DEFAULTS.maxLimit, sortBy: 'make', sortOrder: 'asc' },
    signal,
  });

  return { vehicles: response.data.data, pagination: response.data.pagination };
};

export const setOrganizationVehicleEnabled = async (
  organizationId: string,
  vehicleId: string,
  isEnabled: boolean,
): Promise<VehicleDto> => {
  const response = await apiClient.patch<ApiResponse<VehicleDto>>(
    `/vehicles/${vehicleId}/enabled`,
    { isEnabled },
    inOrganization(organizationId),
  );

  return unwrap(response.data);
};
