'use client';

import type { CompanyExpenseWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateCompanyExpense } from '@/features/company-expenses/api/company-expenses-api';
import { invalidateCompanyExpenseQueries } from '@/features/company-expenses/hooks/invalidate-company-expenses';
import { getApiErrorMessage } from '@/lib/api-error';

export const useUpdateCompanyExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { expenseId: string; body: CompanyExpenseWriteRequest }) =>
      updateCompanyExpense(variables.expenseId, variables.body),
    onSuccess: async () => {
      toast.success('Izmene su sačuvane.');
      await invalidateCompanyExpenseQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
