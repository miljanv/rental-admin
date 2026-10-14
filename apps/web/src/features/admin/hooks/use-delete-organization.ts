'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteOrganization } from '@/features/admin/api/organizations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; name: string }) => deleteOrganization(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Firma je obrisana.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error) => {
      toast.error('Firma nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
