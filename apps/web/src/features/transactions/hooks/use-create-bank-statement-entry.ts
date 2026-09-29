'use client';

import type { BankStatementEntryWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createBankStatementEntry } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateBankStatementEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BankStatementEntryWriteRequest) => createBankStatementEntry(body),
    onSuccess: async () => {
      toast.success('Stavka izvoda je dodata.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Stavka izvoda nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
