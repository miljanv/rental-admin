'use client';

import type { TransactionWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createTransaction } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TransactionWriteRequest) => createTransaction(body),
    onSuccess: async () => {
      toast.success('Transakcija je dodata.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Transakcija nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
