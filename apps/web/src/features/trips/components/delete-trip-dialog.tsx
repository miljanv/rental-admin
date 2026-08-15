'use client';

import type { TripDto } from '@rental-admin/shared';

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
import { useDeleteTrip } from '@/features/trips/hooks/use-delete-trip';
import { tripLabel } from '@/features/trips/lib/trip';

interface DeleteTripDialogProps {
  trip: TripDto | null;
  redirectToList?: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteTripDialog({ trip, redirectToList = false, onOpenChange }: DeleteTripDialogProps) {
  const deleteMutation = useDeleteTrip();

  const handleConfirm = async () => {
    if (!trip) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: trip.id, name: tripLabel(trip), redirectToList });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={trip !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovu vožnju?</AlertDialogTitle>
          <AlertDialogDescription>
            {trip
              ? `${tripLabel(trip)} će biti uklonjena iz evidencije. Ova radnja se ne može opozvati.`
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
