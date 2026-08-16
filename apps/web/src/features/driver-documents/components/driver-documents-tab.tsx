'use client';

import type { DriverDocumentDto, DriverDto } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteDriverDocumentDialog } from '@/features/driver-documents/components/delete-driver-document-dialog';
import { DriverDocumentForm } from '@/features/driver-documents/components/driver-document-form';
import { DriverDocumentsTable } from '@/features/driver-documents/components/driver-documents-table';
import { useDriverDocuments } from '@/features/driver-documents/hooks/use-driver-documents';
import { localTodayIso } from '@/features/driver-documents/lib/document';

interface DriverDocumentsTabProps {
  driver: DriverDto;
}

export function DriverDocumentsTab({ driver }: DriverDocumentsTabProps) {
  const query = useDriverDocuments(driver.id);
  const todayIso = useMemo(() => localTodayIso(), []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<DriverDocumentDto | undefined>(undefined);
  const [documentToDelete, setDocumentToDelete] = useState<DriverDocumentDto | null>(null);

  const documents = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <DriverDocumentForm
          key={editing?.id ?? 'new'}
          driverId={driver.id}
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
            <CardDescription>
              Svi dokumenti vozača sa rokovima važenja. Ugovor o radu i obrazac MA se generišu sa
              Osnovnih podataka — ovde se mogu i ručno doraditi.
            </CardDescription>
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
            <DriverDocumentsTable
              documents={documents}
              isLoading={query.isPending}
              todayIso={todayIso}
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

      <DeleteDriverDocumentDialog
        driverId={driver.id}
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
