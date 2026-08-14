'use client';

import type { DriverDocumentDto } from '@rental-admin/shared';
import { DRIVER_DOCUMENT_TYPE_LABELS, EMPLOYMENT_CONTRACT_TYPE_LABELS } from '@rental-admin/shared';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteDriverDocument } from '@/features/driver-documents/hooks/use-delete-driver-document';

interface DeleteDriverDocumentDialogProps {
  driverId: string;
  document: DriverDocumentDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteDriverDocumentDialog({
  driverId,
  document,
  onOpenChange,
}: DeleteDriverDocumentDialogProps) {
  const deleteMutation = useDeleteDriverDocument(driverId);
  const typeLabel = document ? DRIVER_DOCUMENT_TYPE_LABELS[document.type] : '';
  const contractLabel =
    document?.employmentContractType &&
    EMPLOYMENT_CONTRACT_TYPE_LABELS[document.employmentContractType];

  const handleConfirm = async () => {
    if (!document) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        documentId: document.id,
        label: `${typeLabel} ${document.documentNumber}`.trim(),
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={document !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovaj dokument?</AlertDialogTitle>
          <AlertDialogDescription>
            {document
              ? `${typeLabel}${contractLabel ? ` (${contractLabel})` : ''} br. ${document.documentNumber} će biti uklonjen, uključujući sken ako postoji.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Otkaži</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Brisanje…' : 'Obriši'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
