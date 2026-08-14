'use client';

import type { VehicleMaintenanceDto } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteVehicleMaintenanceDialog } from '@/features/vehicle-maintenance/components/delete-vehicle-maintenance-dialog';
import { VehicleMaintenanceForm } from '@/features/vehicle-maintenance/components/vehicle-maintenance-form';
import { VehicleMaintenanceTable } from '@/features/vehicle-maintenance/components/vehicle-maintenance-table';
import { useMaintenanceCostSummary } from '@/features/vehicle-maintenance/hooks/use-maintenance-cost-summary';
import { useVehicleMaintenance } from '@/features/vehicle-maintenance/hooks/use-vehicle-maintenance';

interface VehicleMaintenanceTabProps {
  vehicleId: string;
}

export function VehicleMaintenanceTab({ vehicleId }: VehicleMaintenanceTabProps) {
  const query = useVehicleMaintenance(vehicleId);
  const costSummaryQuery = useMaintenanceCostSummary({ vehicleId });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleMaintenanceDto | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<VehicleMaintenanceDto | null>(null);

  const records = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Ukupan trošak održavanja</CardTitle>
          <CardDescription>Suma svih zabeleženih zamena delova za ovo vozilo.</CardDescription>
        </CardHeader>
        <CardContent>
          {costSummaryQuery.isPending ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <p className="text-3xl font-semibold">
              {(costSummaryQuery.data?.total ?? 0).toLocaleString('sr-RS')} RSD
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({costSummaryQuery.data?.count ?? 0}{' '}
                {costSummaryQuery.data?.count === 1 ? 'zapis' : 'zapisa'})
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {isFormOpen ? (
        <VehicleMaintenanceForm
          key={editing?.id ?? 'new'}
          vehicleId={vehicleId}
          record={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Istorija održavanja</CardTitle>
            <CardDescription>Zamenjeni delovi, dobavljači i troškovi.</CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj zamenu dela
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Istorija nije učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <VehicleMaintenanceTable
              records={records}
              isLoading={query.isPending}
              onEdit={(record) => {
                setEditing(record);
                setIsFormOpen(true);
              }}
              onRequestDelete={setRecordToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj zamenu dela
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteVehicleMaintenanceDialog
        vehicleId={vehicleId}
        record={recordToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRecordToDelete(null);
          }
        }}
      />
    </div>
  );
}
