'use client';

import { SAFETY_EQUIPMENT_TYPE_LABELS, type VehicleSafetyEquipmentDto } from '@rental-admin/shared';

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
import { useDeleteVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/hooks/use-delete-vehicle-safety-equipment';
import { formatDate } from '@/lib/format';

interface DeleteVehicleSafetyEquipmentDialogProps {
  vehicleId: string;
  equipment: VehicleSafetyEquipmentDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteVehicleSafetyEquipmentDialog({
  vehicleId,
  equipment,
  onOpenChange,
}: DeleteVehicleSafetyEquipmentDialogProps) {
  const deleteMutation = useDeleteVehicleSafetyEquipment(vehicleId);
  const typeLabel = equipment ? SAFETY_EQUIPMENT_TYPE_LABELS[equipment.type] : '';

  const handleConfirm = async () => {
    if (!equipment) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        equipmentId: equipment.id,
        label: `${typeLabel} od ${formatDate(equipment.checkedAt)}`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={equipment !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovaj zapis?</AlertDialogTitle>
          <AlertDialogDescription>
            {equipment
              ? `${typeLabel} od ${formatDate(equipment.checkedAt)} će biti uklonjen iz istorije. Ova radnja se ne može opozvati.`
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
