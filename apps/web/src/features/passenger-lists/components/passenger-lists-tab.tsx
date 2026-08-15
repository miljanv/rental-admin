'use client';

import { PASSENGER_LIST_TYPE_LABELS, type PassengerListType } from '@rental-admin/shared';
import { Plus } from 'lucide-react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PassengerListSection } from '@/features/passenger-lists/components/passenger-list-section';
import { useCreatePassengerList } from '@/features/passenger-lists/hooks/use-create-passenger-list';
import { usePassengerLists } from '@/features/passenger-lists/hooks/use-passenger-lists';

interface PassengerListsTabProps {
  contractId: string;
  /** Drives which list type is suggested first — set on the contract's "period i relacija" step. */
  isInternational: boolean;
}

export function PassengerListsTab({ contractId, isInternational }: PassengerListsTabProps) {
  const query = usePassengerLists(contractId);
  const createMutation = useCreatePassengerList(contractId);

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Spiskovi putnika nisu učitani"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  if (query.isPending) {
    return <Skeleton className="h-48 w-full" />;
  }

  const lists = query.data ?? [];
  const suggestedType: PassengerListType = isInternational ? 'INTERNATIONAL' : 'DOMESTIC';
  const otherType: PassengerListType = isInternational ? 'DOMESTIC' : 'INTERNATIONAL';
  const suggestedList = lists.find((list) => list.type === suggestedType);
  const otherList = lists.find((list) => list.type === otherType);

  const createList = (type: PassengerListType) => createMutation.mutate({ type });

  return (
    <div className="space-y-6">
      {suggestedList ? (
        <PassengerListSection
          contractId={contractId}
          list={suggestedList}
          title={PASSENGER_LIST_TYPE_LABELS[suggestedType]}
        />
      ) : (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{PASSENGER_LIST_TYPE_LABELS[suggestedType]}</CardTitle>
            <CardDescription>
              Predloženo na osnovu toga da li ruta ide u inostranstvo. Kreirajte spisak da počnete
              unos putnika.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => createList(suggestedType)} disabled={createMutation.isPending}>
              <Plus className="size-4" aria-hidden />
              Kreiraj spisak
            </Button>
          </CardContent>
        </Card>
      )}

      {otherList ? (
        <PassengerListSection
          contractId={contractId}
          list={otherList}
          title={PASSENGER_LIST_TYPE_LABELS[otherType]}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => createList(otherType)}
          disabled={createMutation.isPending}
        >
          <Plus className="size-4" aria-hidden />
          Dodaj i {PASSENGER_LIST_TYPE_LABELS[otherType].toLowerCase()}
        </Button>
      )}
    </div>
  );
}
