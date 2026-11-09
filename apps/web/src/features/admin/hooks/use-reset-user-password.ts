'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { resetUserPassword } from '@/features/admin/api/users-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useResetUserPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; password: string }) =>
      resetUserPassword(variables.id, { password: variables.password }),
    onSuccess: async (user) => {
      toast.success('Lozinka je resetovana.', {
        description: `${user.username} je odjavljen i menja lozinku pri prijavi.`,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => {
      toast.error('Lozinka nije resetovana.', { description: getApiErrorMessage(error) });
    },
  });
};
