'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createUser } from '@/features/admin/api/users-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: async (user) => {
      toast.success('Korisnik je dodat.', { description: user.username });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      // The organization overview counts its users.
      await queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
    },
    onError: (error) => {
      toast.error('Korisnik nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
