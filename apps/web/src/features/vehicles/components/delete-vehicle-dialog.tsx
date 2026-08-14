'use client';

import type { VehicleDto } from '@rental-admin/shared';

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
import { useDeleteVehicle } from '@/features/vehicles/hooks/use-delete-vehicle';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';

interface DeleteVehicleDialogProps {
  vehicle: VehicleDto | null;
  redirectToList?: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteVehicleDialog({
  vehicle,
  redirectToList = false,
  onOpenChange,
}: DeleteVehicleDialogProps) {
  const deleteMutation = useDeleteVehicle();

  const handleConfirm = async () => {
    if (!vehicle) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: vehicle.id,
        name: vehicleLabel(vehicle),
        redirectToList,
      });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={vehicle !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovo vozilo?</AlertDialogTitle>
          <AlertDialogDescription>
            {vehicle
              ? `${vehicleLabel(vehicle)} će biti uklonjeno iz evidencije. Ova radnja se ne može opozvati.`
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
