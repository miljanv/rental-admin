'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchOrganizations } from '@/features/admin/api/organizations-api';
import { queryKeys } from '@/lib/query-keys';

interface UseOrganizationsOptions {
  /** Off for anyone who is not a superadmin, so no request is made at all. */
  enabled?: boolean;
}

export const useOrganizations = ({ enabled = true }: UseOrganizationsOptions = {}) =>
  useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: ({ signal }) => fetchOrganizations(signal),
    enabled,
  });
