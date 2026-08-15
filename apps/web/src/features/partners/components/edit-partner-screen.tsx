'use client';

import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PartnerForm } from '@/features/partners/components/partner-form';
import { usePartner } from '@/features/partners/hooks/use-partner';

interface EditPartnerScreenProps {
  partnerId: string;
}

export function EditPartnerScreen({ partnerId }: EditPartnerScreenProps) {
  const query = usePartner(partnerId);

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
        error={query.error ?? new Error('Partner nije pronađen.')}
        title="Partner nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return <PartnerForm partner={query.data} />;
}
