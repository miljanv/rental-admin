'use client';

import type { TransactionWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateTransaction } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; body: TransactionWriteRequest }) =>
      updateTransaction(variables.id, variables.body),
    onSuccess: async () => {
      toast.success('Transakcija je izmenjena.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Transakcija nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
