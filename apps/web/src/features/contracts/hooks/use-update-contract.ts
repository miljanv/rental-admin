'use client';

import { contractRouteLabel } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateContract } from '@/features/contracts/api/contracts-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateContract = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Parameters<typeof updateContract>[1]) => updateContract(id, body),
    onSuccess: async (contract) => {
      toast.success('Izmene su sačuvane.', { description: contractRouteLabel(contract) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      router.push(`/contracts/${contract.id}`);
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
