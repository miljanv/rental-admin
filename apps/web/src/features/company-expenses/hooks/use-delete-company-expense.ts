'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteCompanyExpense } from '@/features/company-expenses/api/company-expenses-api';
import { invalidateCompanyExpenseQueries } from '@/features/company-expenses/hooks/invalidate-company-expenses';
import { getApiErrorMessage } from '@/lib/api-error';

export const useDeleteCompanyExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { expenseId: string; label: string }) =>
      deleteCompanyExpense(variables.expenseId),
    onSuccess: async (_result, variables) => {
      toast.success('Trošak je obrisan.', { description: variables.label });
      await invalidateCompanyExpenseQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Trošak nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
