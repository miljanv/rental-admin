'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchOrganizationVehicles } from '@/features/admin/api/organizations-api';
import { queryKeys } from '@/lib/query-keys';

export const useOrganizationVehicles = (organizationId: string, page: number) =>
  useQuery({
    queryKey: queryKeys.organizations.vehicles(organizationId, page),
    queryFn: ({ signal }) => fetchOrganizationVehicles(organizationId, page, signal),
    placeholderData: (previous) => previous,
  });
