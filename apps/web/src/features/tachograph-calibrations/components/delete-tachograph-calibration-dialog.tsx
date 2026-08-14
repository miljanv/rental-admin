'use client';

import type { TachographCalibrationDto } from '@rental-admin/shared';

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
import { useDeleteTachographCalibration } from '@/features/tachograph-calibrations/hooks/use-delete-tachograph-calibration';
import { formatDate } from '@/lib/format';

interface DeleteTachographCalibrationDialogProps {
  vehicleId: string;
  calibration: TachographCalibrationDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteTachographCalibrationDialog({
  vehicleId,
  calibration,
  onOpenChange,
}: DeleteTachographCalibrationDialogProps) {
  const deleteMutation = useDeleteTachographCalibration(vehicleId);

  const handleConfirm = async () => {
    if (!calibration) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        calibrationId: calibration.id,
        label: `Kalibracija od ${formatDate(calibration.calibratedAt)}`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={calibration !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovu kalibraciju?</AlertDialogTitle>
          <AlertDialogDescription>
            {calibration
              ? `Kalibracija od ${formatDate(calibration.calibratedAt)} će biti uklonjena iz istorije. Ova radnja se ne može opozvati.`
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
