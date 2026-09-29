'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createSupplier } from '@/features/suppliers/api/suppliers-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createSupplier,
    onSuccess: async (supplier) => {
      toast.success('Dobavljač je dodat.', { description: supplier.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companyExpenses.suppliers() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fuelLogs.suppliers() });
      router.push('/suppliers');
    },
    onError: (error) => {
      toast.error('Dobavljač nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
