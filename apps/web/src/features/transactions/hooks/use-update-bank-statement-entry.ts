'use client';

import type { BankStatementEntryWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateBankStatementEntry } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateBankStatementEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; body: BankStatementEntryWriteRequest }) =>
      updateBankStatementEntry(variables.id, variables.body),
    onSuccess: async () => {
      toast.success('Stavka izvoda je izmenjena.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.partners.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Stavka izvoda nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
