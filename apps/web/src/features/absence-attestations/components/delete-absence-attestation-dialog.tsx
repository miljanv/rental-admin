'use client';

import type { AbsenceAttestationDto } from '@rental-admin/shared';
import { ABSENCE_REASON_LABELS } from '@rental-admin/shared';

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
import { useDeleteAbsenceAttestation } from '@/features/absence-attestations/hooks/use-delete-absence-attestation';
import { formatDateTimeSr } from '@/lib/format';

interface DeleteAbsenceAttestationDialogProps {
  driverId: string;
  attestation: AbsenceAttestationDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeleteAbsenceAttestationDialog({
  driverId,
  attestation,
  onOpenChange,
}: DeleteAbsenceAttestationDialogProps) {
  const deleteMutation = useDeleteAbsenceAttestation(driverId);

  const handleConfirm = async () => {
    if (!attestation) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ attestationId: attestation.id });
      onOpenChange(false);
    } catch {
      // Toast already shown.
    }
  };

  return (
    <AlertDialog open={attestation !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovu potvrdu?</AlertDialogTitle>
          <AlertDialogDescription>
            {attestation
              ? `${ABSENCE_REASON_LABELS[attestation.reason]} od ${formatDateTimeSr(attestation.periodFrom)} do ${formatDateTimeSr(attestation.periodTo)} će biti uklonjena, uključujući PDF.`
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
