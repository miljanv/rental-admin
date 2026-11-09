import type {
  ApiResponse,
  DeleteUserResult,
  ManagedUserDto,
  UserCreateRequest,
  UserPasswordResetRequest,
  UserUpdateRequest,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';
import type { UserListQueryParams } from '@/lib/query-keys';

export const fetchUsers = async (
  params: UserListQueryParams,
  signal?: AbortSignal,
): Promise<ManagedUserDto[]> => {
  const response = await apiClient.get<ApiResponse<ManagedUserDto[]>>('/users', {
    params,
    signal,
  });

  return unwrap(response.data);
};

export const createUser = async (body: UserCreateRequest): Promise<ManagedUserDto> => {
  const response = await apiClient.post<ApiResponse<ManagedUserDto>>('/users', body);

  return unwrap(response.data);
};

export const updateUser = async (id: string, body: UserUpdateRequest): Promise<ManagedUserDto> => {
  const response = await apiClient.patch<ApiResponse<ManagedUserDto>>(`/users/${id}`, body);

  return unwrap(response.data);
};

export const resetUserPassword = async (
  id: string,
  body: UserPasswordResetRequest,
): Promise<ManagedUserDto> => {
  const response = await apiClient.post<ApiResponse<ManagedUserDto>>(
    `/users/${id}/reset-password`,
    body,
  );

  return unwrap(response.data);
};

export const revokeUserSessions = async (id: string): Promise<ManagedUserDto> => {
  const response = await apiClient.post<ApiResponse<ManagedUserDto>>(
    `/users/${id}/revoke-sessions`,
  );

  return unwrap(response.data);
};

export const deleteUser = async (id: string): Promise<DeleteUserResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteUserResult>>(`/users/${id}`);

  return unwrap(response.data);
};
