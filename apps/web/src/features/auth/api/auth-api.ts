import type {
  ApiResponse,
  AuthUserDto,
  LoginRequest,
  LoginResult,
  OrganizationUsageDto,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const login = async (body: LoginRequest): Promise<LoginResult> => {
  const response = await apiClient.post<ApiResponse<LoginResult>>('/auth/login', body);

  return unwrap(response.data);
};

export const fetchCurrentUser = async (signal?: AbortSignal): Promise<AuthUserDto> => {
  const response = await apiClient.get<ApiResponse<AuthUserDto>>('/auth/me', { signal });

  return unwrap(response.data);
};

export const fetchOrganizationUsage = async (
  signal?: AbortSignal,
): Promise<OrganizationUsageDto | null> => {
  const response = await apiClient.get<ApiResponse<OrganizationUsageDto | null>>('/auth/usage', {
    signal,
  });

  return unwrap(response.data);
};
