'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteVatReturn } from '@/features/transactions/api/vat-returns-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteVatReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVatReturn(id),
    onSuccess: async () => {
      toast.success('PDV prijava je obrisana.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('PDV prijava nije obrisana.', { description: getApiErrorMessage(error) });
    },
  });
};
