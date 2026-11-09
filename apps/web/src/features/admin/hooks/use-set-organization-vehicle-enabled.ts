'use client';

import type { VehicleDto } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { setOrganizationVehicleEnabled } from '@/features/admin/api/organizations-api';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

export const useSetOrganizationVehicleEnabled = (organizationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicle: Pick<VehicleDto, 'id' | 'isEnabled'>) =>
      setOrganizationVehicleEnabled(organizationId, vehicle.id, !vehicle.isEnabled),
    onSuccess: async (vehicle) => {
      toast.success(vehicle.isEnabled ? 'Vozilo je aktivirano.' : 'Vozilo je deaktivirano.', {
        description: vehicleLabel(vehicle),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.organizationUsage.all }),
      ]);
    },
    onError: (error) => {
      toast.error('Promena nije sačuvana.', { description: getApiErrorMessage(error) });
    },
  });
};
