'use client';

import { VEHICLE_INSPECTION_TYPE_LABELS, type VehicleInspectionDto } from '@rental-admin/shared';

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
import { useDeleteVehicleInspection } from '@/features/vehicle-inspections/hooks/use-delete-vehicle-inspection';
import { formatDate } from '@/lib/format';

interface DeleteVehicleInspectionDialogProps {
  vehicleId: string;
  inspection: VehicleInspectionDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteVehicleInspectionDialog({
  vehicleId,
  inspection,
  onOpenChange,
}: DeleteVehicleInspectionDialogProps) {
  const deleteMutation = useDeleteVehicleInspection(vehicleId);
  const typeLabel = inspection ? VEHICLE_INSPECTION_TYPE_LABELS[inspection.type] : '';

  const handleConfirm = async () => {
    if (!inspection) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        inspectionId: inspection.id,
        label: `${typeLabel} od ${formatDate(inspection.inspectedAt)}`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={inspection !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovaj pregled?</AlertDialogTitle>
          <AlertDialogDescription>
            {inspection
              ? `${typeLabel} pregled od ${formatDate(inspection.inspectedAt)} će biti uklonjen iz istorije. Ova radnja se ne može opozvati.`
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
