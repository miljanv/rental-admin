'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createOrganization } from '@/features/admin/api/organizations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: async (organization) => {
      toast.success('Firma je dodata.', { description: organization.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error) => {
      toast.error('Firma nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
