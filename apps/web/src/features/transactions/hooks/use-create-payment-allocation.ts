'use client';

import type { PaymentAllocationWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createPaymentAllocation } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreatePaymentAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { transactionId: string; body: PaymentAllocationWriteRequest }) =>
      createPaymentAllocation(variables.transactionId, variables.body),
    onSuccess: async () => {
      toast.success('Rasknjižavanje je sačuvano.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.companyExpenses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.trips.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.partners.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Rasknjižavanje nije sačuvano.', { description: getApiErrorMessage(error) });
    },
  });
};
