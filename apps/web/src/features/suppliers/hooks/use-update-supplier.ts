'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateSupplier } from '@/features/suppliers/api/suppliers-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateSupplier = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Parameters<typeof updateSupplier>[1]) => updateSupplier(id, body),
    onSuccess: async (supplier) => {
      toast.success('Izmene su sačuvane.', { description: supplier.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companyExpenses.suppliers() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fuelLogs.suppliers() });
      router.push('/suppliers');
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
