'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteTransaction } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; label: string }) => deleteTransaction(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Transakcija je obrisana.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Transakcija nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
