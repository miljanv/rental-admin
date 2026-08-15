'use client';

import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ContractWizard } from '@/features/contracts/components/contract-wizard';
import { useContract } from '@/features/contracts/hooks/use-contract';

interface EditContractScreenProps {
  contractId: string;
}

export function EditContractScreen({ contractId }: EditContractScreenProps) {
  const query = useContract(contractId);

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
        error={query.error ?? new Error('Ugovor nije pronađen.')}
        title="Ugovor nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return <ContractWizard contract={query.data} />;
}
