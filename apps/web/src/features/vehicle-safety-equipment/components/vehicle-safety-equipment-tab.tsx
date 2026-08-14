'use client';

import type { VehicleSafetyEquipmentDto } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteVehicleSafetyEquipmentDialog } from '@/features/vehicle-safety-equipment/components/delete-vehicle-safety-equipment-dialog';
import { SafetyEquipmentStatusOverview } from '@/features/vehicle-safety-equipment/components/safety-equipment-status-overview';
import { VehicleSafetyEquipmentForm } from '@/features/vehicle-safety-equipment/components/vehicle-safety-equipment-form';
import { VehicleSafetyEquipmentTable } from '@/features/vehicle-safety-equipment/components/vehicle-safety-equipment-table';
import { useVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/hooks/use-vehicle-safety-equipment';
import { localTodayIso } from '@/features/vehicle-safety-equipment/lib/safety-equipment';

interface VehicleSafetyEquipmentTabProps {
  vehicleId: string;
}

export function VehicleSafetyEquipmentTab({ vehicleId }: VehicleSafetyEquipmentTabProps) {
  const query = useVehicleSafetyEquipment(vehicleId);
  const todayIso = useMemo(() => localTodayIso(), []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleSafetyEquipmentDto | undefined>(undefined);
  const [equipmentToDelete, setEquipmentToDelete] = useState<VehicleSafetyEquipmentDto | null>(
    null,
  );

  const equipment = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Oprema nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        !query.isPending && <SafetyEquipmentStatusOverview equipment={equipment} todayIso={todayIso} />
      )}

      {isFormOpen ? (
        <VehicleSafetyEquipmentForm
          key={editing?.id ?? 'new'}
          vehicleId={vehicleId}
          equipment={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Istorija provera</CardTitle>
            <CardDescription>Prva pomoć i PP aparat, sa rokovima važenja.</CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj proveru
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? null : (
            <VehicleSafetyEquipmentTable
              equipment={equipment}
              isLoading={query.isPending}
              todayIso={todayIso}
              onEdit={(item) => {
                setEditing(item);
                setIsFormOpen(true);
              }}
              onRequestDelete={setEquipmentToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj proveru
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteVehicleSafetyEquipmentDialog
        vehicleId={vehicleId}
        equipment={equipmentToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEquipmentToDelete(null);
          }
        }}
      />
    </div>
  );
}
