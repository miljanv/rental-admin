'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchUsers } from '@/features/admin/api/users-api';
import { queryKeys, type UserListQueryParams } from '@/lib/query-keys';

export const useUsers = (params: UserListQueryParams) =>
  useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) => fetchUsers(params, signal),
    placeholderData: (previous) => previous,
  });
