'use client';

import type { OrganizationWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateOrganization } from '@/features/admin/api/organizations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; body: OrganizationWriteRequest }) =>
      updateOrganization(variables.id, variables.body),
    onSuccess: async (organization) => {
      toast.success('Firma je sačuvana.', { description: organization.name });
      // Users show their organization's name, so both lists are refreshed.
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => {
      toast.error('Firma nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
