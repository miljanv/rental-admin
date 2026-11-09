'use client';

import type { OrganizationDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateOrganization } from '@/features/admin/api/organizations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/** Suspends an active organization or reactivates a suspended one, keeping its other settings. */
export const useSetOrganizationActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organization: OrganizationDto) =>
      updateOrganization(organization.id, {
        name: organization.name,
        isActive: !organization.isActive,
        maxVehicles: organization.usage.maxVehicles,
        maxUsers: organization.usage.maxUsers,
      }),
    onSuccess: async (organization) => {
      toast.success(organization.isActive ? 'Firma je aktivirana.' : 'Firma je suspendovana.', {
        description: organization.name,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => {
      toast.error('Promena nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
