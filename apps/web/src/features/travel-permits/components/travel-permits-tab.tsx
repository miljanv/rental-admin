'use client';

import type { TravelPermitDto } from '@rental-admin/shared';
import { AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteTravelPermitDialog } from '@/features/travel-permits/components/delete-travel-permit-dialog';
import { TravelPermitForm } from '@/features/travel-permits/components/travel-permit-form';
import { TravelPermitsTable } from '@/features/travel-permits/components/travel-permits-table';
import { useTravelPermits } from '@/features/travel-permits/hooks/use-travel-permits';

interface TravelPermitsTabProps {
  contractId: string;
  isInternational: boolean;
}

export function TravelPermitsTab({ contractId, isInternational }: TravelPermitsTabProps) {
  const query = useTravelPermits(contractId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TravelPermitDto | undefined>(undefined);
  const [permitToDelete, setPermitToDelete] = useState<TravelPermitDto | null>(null);

  const permits = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {isInternational && !query.isPending && permits.length === 0 ? (
        <div
          role="alert"
          className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex gap-3 rounded-lg border px-4 py-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Ruta ide u inostranstvo, a nema unetih putnih dozvola.</p>
            <p className="text-amber-800/80 dark:text-amber-300/80">
              Ugovor ne može preći u status &quot;U toku&quot; dok se ne doda bar jedna dozvola.
            </p>
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <TravelPermitForm
          key={editing?.id ?? 'new'}
          contractId={contractId}
          permit={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Putne dozvole</CardTitle>
            <CardDescription>Dozvole po zemlji za međunarodne rute.</CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj dozvolu
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Dozvole nisu učitane"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <TravelPermitsTable
              permits={permits}
              isLoading={query.isPending}
              onEdit={(permit) => {
                setEditing(permit);
                setIsFormOpen(true);
              }}
              onRequestDelete={setPermitToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj dozvolu
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteTravelPermitDialog
        contractId={contractId}
        permit={permitToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPermitToDelete(null);
          }
        }}
      />
    </div>
  );
}
