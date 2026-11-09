'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchOrganizationUsage } from '@/features/auth/api/auth-api';
import { queryKeys } from '@/lib/query-keys';

export const useOrganizationUsage = () =>
  useQuery({
    queryKey: queryKeys.organizationUsage.all,
    queryFn: ({ signal }) => fetchOrganizationUsage(signal),
  });
