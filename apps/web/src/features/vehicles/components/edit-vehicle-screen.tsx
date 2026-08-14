'use client';

import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';
import { useVehicle } from '@/features/vehicles/hooks/use-vehicle';

interface EditVehicleScreenProps {
  vehicleId: string;
}

export function EditVehicleScreen({ vehicleId }: EditVehicleScreenProps) {
  const query = useVehicle(vehicleId);

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        error={query.error ?? new Error('Vozilo nije pronađeno.')}
        title="Vozilo nije učitano"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return <VehicleForm vehicle={query.data} />;
}
