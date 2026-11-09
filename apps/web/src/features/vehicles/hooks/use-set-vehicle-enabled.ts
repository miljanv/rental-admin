'use client';

import type { VehicleDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { setVehicleEnabled } from '@/features/vehicles/api/vehicles-api';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useSetVehicleEnabled = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle: Pick<VehicleDto, 'id' | 'isEnabled'>) =>
      setVehicleEnabled(vehicle.id, !vehicle.isEnabled),
    onSuccess: async (vehicle) => {
      toast.success(vehicle.isEnabled ? 'Vozilo je aktivirano.' : 'Vozilo je deaktivirano.', {
        description: vehicleLabel(vehicle),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationUsage.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Promena nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
