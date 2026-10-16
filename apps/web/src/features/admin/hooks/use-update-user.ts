'use client';

import type { UserUpdateRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateUser } from '@/features/admin/api/users-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; body: UserUpdateRequest }) =>
      updateUser(variables.id, variables.body),
    onSuccess: async (user) => {
      toast.success('Korisnik je sačuvan.', { description: user.username });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error) => {
      toast.error('Korisnik nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
