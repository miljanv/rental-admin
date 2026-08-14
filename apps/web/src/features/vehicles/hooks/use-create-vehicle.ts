'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createVehicle } from '@/features/vehicles/api/vehicles-api';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createVehicle,
    onSuccess: async (vehicle) => {
      toast.success('Vozilo je dodato.', { description: vehicleLabel(vehicle) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      router.push(`/vehicles/${vehicle.id}`);
    },
    onError: (error) => {
      toast.error('Vozilo nije sačuvano.', { description: getApiErrorMessage(error) });
    },
  });
};
