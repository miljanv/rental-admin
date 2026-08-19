'use client';

import type { AbsenceAttestationDto, DriverDto } from '@rental-admin/shared';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AbsenceAttestationsTable } from '@/features/absence-attestations/components/absence-attestations-table';
import { DeleteAbsenceAttestationDialog } from '@/features/absence-attestations/components/delete-absence-attestation-dialog';
import { GenerateAbsenceAttestationForm } from '@/features/absence-attestations/components/generate-absence-attestation-form';
import { useAbsenceAttestations } from '@/features/absence-attestations/hooks/use-absence-attestations';

interface AbsenceAttestationsTabProps {
  driver: DriverDto;
}

export function AbsenceAttestationsTab({ driver }: AbsenceAttestationsTabProps) {
  const query = useAbsenceAttestations(driver.id);
  const [attestationToDelete, setAttestationToDelete] = useState<AbsenceAttestationDto | null>(null);
  const attestations = query.data ?? [];

  return (
    <div className="space-y-6">
      <GenerateAbsenceAttestationForm driverId={driver.id} />

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Istorija potvrda</CardTitle>
          <CardDescription>
            Svaka generisana potvrda o odsustvu ostaje u evidenciji zaposlenog.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Potvrde nisu učitane"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <AbsenceAttestationsTable
              attestations={attestations}
              isLoading={query.isPending}
              onRequestDelete={setAttestationToDelete}
            />
          )}
        </CardContent>
      </Card>

      <DeleteAbsenceAttestationDialog
        driverId={driver.id}
        attestation={attestationToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setAttestationToDelete(null);
          }
        }}
      />
    </div>
  );
}
