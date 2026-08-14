'use client';

import type { VehicleMaintenanceDto } from '@rental-admin/shared';

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
import { useDeleteVehicleMaintenance } from '@/features/vehicle-maintenance/hooks/use-delete-vehicle-maintenance';
import { formatDate } from '@/lib/format';

interface DeleteVehicleMaintenanceDialogProps {
  vehicleId: string;
  record: VehicleMaintenanceDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteVehicleMaintenanceDialog({
  vehicleId,
  record,
  onOpenChange,
}: DeleteVehicleMaintenanceDialogProps) {
  const deleteMutation = useDeleteVehicleMaintenance(vehicleId);

  const handleConfirm = async () => {
    if (!record) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        maintenanceId: record.id,
        label: `${record.partName} (${formatDate(record.date)})`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={record !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovaj zapis?</AlertDialogTitle>
          <AlertDialogDescription>
            {record
              ? `${record.partName} od ${formatDate(record.date)} će biti uklonjen iz istorije. Ova radnja se ne može opozvati.`
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
