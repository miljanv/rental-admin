'use client';

import type { OrganizationProfileRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateOrganizationProfile } from '@/features/admin/api/organizations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateOrganizationProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; body: OrganizationProfileRequest }) =>
      updateOrganizationProfile(variables.id, variables.body),
    onSuccess: async (organization) => {
      toast.success('Podaci o firmi su sačuvani.', { description: organization.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error) => {
      toast.error('Podaci o firmi nisu sačuvani.', { description: getApiErrorMessage(error) });
    },
  });
};
