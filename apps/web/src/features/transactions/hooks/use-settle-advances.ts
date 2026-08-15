'use client';

import type { SettleAdvancesRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { settleAdvances } from '@/features/transactions/api/transactions-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useSettleAdvances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SettleAdvancesRequest) => settleAdvances(body),
    onSuccess: async (result) => {
      toast.success('Avansi su razduženi.', {
        description: `${result.settledCount} avansa · ${result.settlement.supplier ?? ''}`,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
    onError: (error) => {
      toast.error('Avansi nisu razduženi.', { description: getApiErrorMessage(error) });
    },
  });
};
