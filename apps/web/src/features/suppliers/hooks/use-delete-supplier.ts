'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteSupplier } from '@/features/suppliers/api/suppliers-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; name: string }) => deleteSupplier(variables.id),
    onSuccess: async (_result, variables) => {
      toast.success('Dobavljač je obrisan.', { description: variables.name });
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companyExpenses.suppliers() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.fuelLogs.suppliers() });
    },
    onError: (error) => {
      toast.error('Dobavljač nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
