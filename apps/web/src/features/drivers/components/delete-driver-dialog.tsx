'use client';

import type { DriverDto } from '@rental-admin/shared';

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
import { useDeleteDriver } from '@/features/drivers/hooks/use-delete-driver';
import { driverFullName } from '@/features/drivers/lib/driver';

interface DeleteDriverDialogProps {
  driver: DriverDto | null;
  redirectToList?: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteDriverDialog({
  driver,
  redirectToList = false,
  onOpenChange,
}: DeleteDriverDialogProps) {
  const deleteMutation = useDeleteDriver();

  const handleConfirm = async () => {
    if (!driver) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: driver.id,
        name: driverFullName(driver),
        redirectToList,
      });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={driver !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovog zaposlenog?</AlertDialogTitle>
          <AlertDialogDescription>
            {driver
              ? `${driverFullName(driver)} će biti uklonjen iz evidencije. Ova radnja se ne može opozvati.`
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
