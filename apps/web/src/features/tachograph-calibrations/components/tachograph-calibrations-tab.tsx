'use client';

import type { TachographCalibrationDto, TachographType } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteTachographCalibrationDialog } from '@/features/tachograph-calibrations/components/delete-tachograph-calibration-dialog';
import { TachographCalibrationForm } from '@/features/tachograph-calibrations/components/tachograph-calibration-form';
import { TachographCalibrationsTable } from '@/features/tachograph-calibrations/components/tachograph-calibrations-table';
import { useTachographCalibrations } from '@/features/tachograph-calibrations/hooks/use-tachograph-calibrations';
import { localTodayIso } from '@/features/tachograph-calibrations/lib/calibration';

interface TachographCalibrationsTabProps {
  vehicleId: string;
  tachographType: TachographType;
}

export function TachographCalibrationsTab({
  vehicleId,
  tachographType,
}: TachographCalibrationsTabProps) {
  const query = useTachographCalibrations(vehicleId);
  const todayIso = useMemo(() => localTodayIso(), []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TachographCalibrationDto | undefined>(undefined);
  const [calibrationToDelete, setCalibrationToDelete] = useState<TachographCalibrationDto | null>(
    null,
  );

  const calibrations = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  if (tachographType === 'NONE') {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Tahograf</CardTitle>
          <CardDescription>Ovo vozilo je označeno kao vozilo bez tahografa.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <TachographCalibrationForm
          key={editing?.id ?? 'new'}
          vehicleId={vehicleId}
          tachographType={tachographType}
          calibration={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Tahograf</CardTitle>
            <CardDescription>
              Istorija kalibracija, sa rokom koji zavisi od tipa tahografa vozila.
            </CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj kalibraciju
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Kalibracije nisu učitane"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <TachographCalibrationsTable
              calibrations={calibrations}
              isLoading={query.isPending}
              todayIso={todayIso}
              onEdit={(calibration) => {
                setEditing(calibration);
                setIsFormOpen(true);
              }}
              onRequestDelete={setCalibrationToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj kalibraciju
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteTachographCalibrationDialog
        vehicleId={vehicleId}
        calibration={calibrationToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setCalibrationToDelete(null);
          }
        }}
      />
    </div>
  );
}
