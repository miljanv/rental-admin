'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchOrganizationOverview } from '@/features/admin/api/organizations-api';
import { queryKeys } from '@/lib/query-keys';

export const useOrganizationOverview = (id: string) =>
  useQuery({
    queryKey: queryKeys.organizations.overview(id),
    queryFn: ({ signal }) => fetchOrganizationOverview(id, signal),
  });
