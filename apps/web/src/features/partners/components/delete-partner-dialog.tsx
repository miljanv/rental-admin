'use client';

import type { PartnerDto } from '@rental-admin/shared';

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
import { useDeletePartner } from '@/features/partners/hooks/use-delete-partner';
import { partnerLabel } from '@/features/partners/lib/partner';

interface DeletePartnerDialogProps {
  partner: PartnerDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function DeletePartnerDialog({ partner, onOpenChange }: DeletePartnerDialogProps) {
  const deleteMutation = useDeletePartner();

  const handleConfirm = async () => {
    if (!partner) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: partner.id, name: partnerLabel(partner) });
      onOpenChange(false);
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  };

  return (
    <AlertDialog open={partner !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obrisati ovog partnera?</AlertDialogTitle>
          <AlertDialogDescription>
            {partner
              ? `${partnerLabel(partner)} će biti uklonjen iz evidencije. Ako partner ima ugovore, brisanje neće uspeti.`
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
