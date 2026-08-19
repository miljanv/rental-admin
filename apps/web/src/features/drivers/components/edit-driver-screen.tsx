'use client';

import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverForm } from '@/features/drivers/components/driver-form';
import { useDriver } from '@/features/drivers/hooks/use-driver';

interface EditDriverScreenProps {
  driverId: string;
}

export function EditDriverScreen({ driverId }: EditDriverScreenProps) {
  const query = useDriver(driverId);

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
        error={query.error ?? new Error('Zaposleni nije pronađen.')}
        title="Zaposleni nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return <DriverForm driver={query.data} />;
}
