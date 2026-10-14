'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteUser } from '@/features/admin/api/users-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; username: string }) => deleteUser(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Korisnik je obrisan.', { description: variables.username });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error) => {
      toast.error('Korisnik nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
