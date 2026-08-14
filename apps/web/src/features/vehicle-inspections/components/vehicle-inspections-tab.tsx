'use client';

import type { VehicleInspectionDto } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteVehicleInspectionDialog } from '@/features/vehicle-inspections/components/delete-vehicle-inspection-dialog';
import { VehicleInspectionForm } from '@/features/vehicle-inspections/components/vehicle-inspection-form';
import { VehicleInspectionsTable } from '@/features/vehicle-inspections/components/vehicle-inspections-table';
import { useVehicleInspections } from '@/features/vehicle-inspections/hooks/use-vehicle-inspections';
import { localTodayIso } from '@/features/vehicle-inspections/lib/inspection';

interface VehicleInspectionsTabProps {
  vehicleId: string;
}

export function VehicleInspectionsTab({ vehicleId }: VehicleInspectionsTabProps) {
  const query = useVehicleInspections(vehicleId);
  const todayIso = useMemo(() => localTodayIso(), []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleInspectionDto | undefined>(undefined);
  const [inspectionToDelete, setInspectionToDelete] = useState<VehicleInspectionDto | null>(null);

  const inspections = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <VehicleInspectionForm
          key={editing?.id ?? 'new'}
          vehicleId={vehicleId}
          inspection={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Tehnički pregledi</CardTitle>
            <CardDescription>
              Redovni (godišnji), šestomesečni i mesečni pregled, sa automatski izračunatim rokom.
            </CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj pregled
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Pregledi nisu učitani"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <VehicleInspectionsTable
              inspections={inspections}
              isLoading={query.isPending}
              todayIso={todayIso}
              onEdit={(inspection) => {
                setEditing(inspection);
                setIsFormOpen(true);
              }}
              onRequestDelete={setInspectionToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj pregled
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteVehicleInspectionDialog
        vehicleId={vehicleId}
        inspection={inspectionToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setInspectionToDelete(null);
          }
        }}
      />
    </div>
  );
}
