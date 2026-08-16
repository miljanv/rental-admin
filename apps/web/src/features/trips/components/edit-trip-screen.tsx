'use client';

import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { TripForm } from '@/features/trips/components/trip-form';
import { useTrip } from '@/features/trips/hooks/use-trip';

interface EditTripScreenProps {
  tripId: string;
}

export function EditTripScreen({ tripId }: EditTripScreenProps) {
  const query = useTrip(tripId);

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
        error={query.error ?? new Error('Vožnja nije pronađena.')}
        title="Vožnja nije učitana"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return <TripForm trip={query.data} />;
}
