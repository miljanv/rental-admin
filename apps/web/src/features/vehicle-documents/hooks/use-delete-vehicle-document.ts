'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteVehicleDocument } from '@/features/vehicle-documents/api/vehicle-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useDeleteVehicleDocument = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { documentId: string; label: string }) =>
      deleteVehicleDocument(vehicleId, variables.documentId),
    onSuccess: async (_result, variables) => {
      toast.success('Dokument je obrisan.', { description: variables.label });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
    },
    onError: (error) => {
      toast.error('Dokument nije obrisan.', { description: getApiErrorMessage(error) });
    },
  });
};
