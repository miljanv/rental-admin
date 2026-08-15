'use client';

import type { TravelPermitDto } from '@rental-admin/shared';

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
import { useDeleteTravelPermit } from '@/features/travel-permits/hooks/use-delete-travel-permit';

interface DeleteTravelPermitDialogProps {
  contractId: string;
  permit: TravelPermitDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteTravelPermitDialog({
  contractId,
  permit,
  onOpenChange,
}: DeleteTravelPermitDialogProps) {
  const deleteMutation = useDeleteTravelPermit(contractId);

  const handleConfirm = async () => {
    if (!permit) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(permit.id);
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={permit !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovu putnu dozvolu?</AlertDialogTitle>
          <AlertDialogDescription>
            {permit
              ? `Dozvola za ${permit.country} (${permit.permitNumber}) će biti uklonjena, uključujući priloženi fajl. Ova radnja se ne može opozvati.`
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
