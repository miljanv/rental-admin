'use client';

import { FUEL_LOG_FUEL_TYPE_LABELS, type FuelLogDto } from '@rental-admin/shared';

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
import { useDeleteFuelLog } from '@/features/fuel-logs/hooks/use-delete-fuel-log';
import { formatDate } from '@/lib/format';

interface DeleteFuelLogDialogProps {
  fuelLog: FuelLogDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteFuelLogDialog({ fuelLog, onOpenChange }: DeleteFuelLogDialogProps) {
  const deleteMutation = useDeleteFuelLog();

  const handleConfirm = async () => {
    if (!fuelLog) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        fuelLogId: fuelLog.id,
        label: `${FUEL_LOG_FUEL_TYPE_LABELS[fuelLog.fuelType]} od ${formatDate(fuelLog.fueledAt)}`,
      });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={fuelLog !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovo sipanje?</AlertDialogTitle>
          <AlertDialogDescription>
            {fuelLog
              ? `Zapis o sipanju od ${formatDate(fuelLog.fueledAt)} će biti uklonjen iz istorije. Ova radnja se ne može opozvati.`
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
