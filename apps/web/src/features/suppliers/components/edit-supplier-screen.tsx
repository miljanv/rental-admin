'use client';

import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierForm } from '@/features/suppliers/components/supplier-form';
import { useSupplier } from '@/features/suppliers/hooks/use-supplier';

interface EditSupplierScreenProps {
  supplierId: string;
}

export function EditSupplierScreen({ supplierId }: EditSupplierScreenProps) {
  const query = useSupplier(supplierId);

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
        error={query.error ?? new Error('Dobavljač nije pronađen.')}
        title="Dobavljač nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return <SupplierForm supplier={query.data} />;
}
