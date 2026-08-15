'use client';

import type { ContractStatus } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { changeContractStatus } from '@/features/contracts/api/contracts-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useChangeContractStatus = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: ContractStatus) => changeContractStatus(id, { status }),
    onSuccess: async () => {
      toast.success('Status ugovora je promenjen.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
    onError: (error) => {
      toast.error('Status nije promenjen.', { description: getApiErrorMessage(error) });
    },
  });
};
