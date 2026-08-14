'use client';

import { VEHICLE_DOCUMENT_TYPE_LABELS, type VehicleDocumentDto } from '@rental-admin/shared';

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
import { useDeleteVehicleDocument } from '@/features/vehicle-documents/hooks/use-delete-vehicle-document';

interface DeleteVehicleDocumentDialogProps {
  vehicleId: string;
  document: VehicleDocumentDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteVehicleDocumentDialog({
  vehicleId,
  document,
  onOpenChange,
}: DeleteVehicleDocumentDialogProps) {
  const deleteMutation = useDeleteVehicleDocument(vehicleId);
  const typeLabel = document ? VEHICLE_DOCUMENT_TYPE_LABELS[document.type] : '';

  const handleConfirm = async () => {
    if (!document) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ documentId: document.id, label: typeLabel });
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
              ? `${typeLabel} će biti uklonjena, uključujući sken ako postoji. Ova radnja se ne može opozvati.`
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
