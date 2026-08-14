'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateVehicle } from '@/features/vehicles/api/vehicles-api';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useUpdateVehicle = (id: string) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Parameters<typeof updateVehicle>[1]) => updateVehicle(id, body),
    onSuccess: async (vehicle) => {
      toast.success('Izmene su sačuvane.', { description: vehicleLabel(vehicle) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      router.push(`/vehicles/${vehicle.id}`);
    },
    onError: (error) => {
      toast.error('Izmene nisu sačuvane.', { description: getApiErrorMessage(error) });
    },
  });
};
