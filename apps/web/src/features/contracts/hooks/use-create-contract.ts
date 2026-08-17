'use client';

import { contractRouteLabel } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createContract } from '@/features/contracts/api/contracts-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateContract = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createContract,
    onSuccess: async (contract) => {
      toast.success('Ugovor je kreiran.', { description: contractRouteLabel(contract) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      router.push(`/contracts/${contract.id}`);
    },
    onError: (error) => {
      toast.error('Ugovor nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
