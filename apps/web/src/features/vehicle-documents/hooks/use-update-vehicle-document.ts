'use client';

import type { VehicleDocumentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { updateVehicleDocument } from '@/features/vehicle-documents/api/vehicle-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateVehicleDocument = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { documentId: string; body: VehicleDocumentWriteRequest }) =>
      updateVehicleDocument(vehicleId, variables.documentId, variables.body),
    onSuccess: async () => {
      toast.success('Dokument je izmenjen.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
