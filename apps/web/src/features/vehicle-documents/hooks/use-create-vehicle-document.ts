'use client';

import type { VehicleDocumentWriteRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createVehicleDocument } from '@/features/vehicle-documents/api/vehicle-documents-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateVehicleDocument = (vehicleId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: VehicleDocumentWriteRequest) => createVehicleDocument(vehicleId, body),
    onSuccess: async () => {
      toast.success('Dokument je dodat.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
    onError: (error) => {
      toast.error('Dokument nije sačuvan.', { description: getApiErrorMessage(error) });
    },
  });
};
