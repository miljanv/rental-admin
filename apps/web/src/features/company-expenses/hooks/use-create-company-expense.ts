'use client';

import type { CompanyExpenseWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createCompanyExpense } from '@/features/company-expenses/api/company-expenses-api';
import { invalidateCompanyExpenseQueries } from '@/features/company-expenses/hooks/invalidate-company-expenses';
import { getApiErrorMessage } from '@/lib/api-error';

export const useCreateCompanyExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CompanyExpenseWriteRequest) => createCompanyExpense(body),
    onSuccess: async () => {
      toast.success('Trošak je dodat.');
      await invalidateCompanyExpenseQueries(queryClient);
    },
    onError: (error) => {
      toast.error('Trošak nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
