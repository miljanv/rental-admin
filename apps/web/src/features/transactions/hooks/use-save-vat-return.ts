'use client';

import type { VatReturnWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createVatReturn, updateVatReturn } from '@/features/transactions/api/vat-returns-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

/** Creates the month's VAT return, or updates it when `id` is given. */
export const useSaveVatReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id?: string; body: VatReturnWriteRequest }) =>
      variables.id
        ? updateVatReturn(variables.id, variables.body)
        : createVatReturn(variables.body),
    onSuccess: async () => {
      toast.success('PDV prijava je sačuvana.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('PDV prijava nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
