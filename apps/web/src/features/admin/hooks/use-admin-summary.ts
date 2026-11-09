'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminSummary } from '@/features/admin/api/admin-api';
import { queryKeys } from '@/lib/query-keys';

export const useAdminSummary = () =>
  useQuery({
    queryKey: queryKeys.organizations.summary(),
    queryFn: ({ signal }) => fetchAdminSummary(signal),
  });
