'use client';

import type { VehicleDocumentDto } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteVehicleDocumentDialog } from '@/features/vehicle-documents/components/delete-vehicle-document-dialog';
import { VehicleDocumentForm } from '@/features/vehicle-documents/components/vehicle-document-form';
import { VehicleDocumentsTable } from '@/features/vehicle-documents/components/vehicle-documents-table';
import { useVehicleDocuments } from '@/features/vehicle-documents/hooks/use-vehicle-documents';

interface VehicleDocumentsTabProps {
  vehicleId: string;
}

export function VehicleDocumentsTab({ vehicleId }: VehicleDocumentsTabProps) {
  const query = useVehicleDocuments(vehicleId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleDocumentDto | undefined>(undefined);
  const [documentToDelete, setDocumentToDelete] = useState<VehicleDocumentDto | null>(null);

  const documents = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <VehicleDocumentForm
          key={editing?.id ?? 'new'}
          vehicleId={vehicleId}
          document={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Dokumenti</CardTitle>
            <CardDescription>Saobraćajna dozvola i ostali dokumenti vozila.</CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj dokument
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Dokumenti nisu učitani"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <VehicleDocumentsTable
              documents={documents}
              isLoading={query.isPending}
              onEdit={(document) => {
                setEditing(document);
                setIsFormOpen(true);
              }}
              onRequestDelete={setDocumentToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj dokument
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteVehicleDocumentDialog
        vehicleId={vehicleId}
        document={documentToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDocumentToDelete(null);
          }
        }}
      />
    </div>
  );
}
